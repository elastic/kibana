/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { ElasticsearchClient, Logger } from '@kbn/core/server';
import pRetry from 'p-retry';
import { eventLogTransform } from './transform';

const TRANSFORM_ID = 'kibana-alerting-exec-log-transform';
const DESTINATION_COMPONENT_TEMPLATE = 'kibana-alerting-exec-log-component-template';
const DESTINATION_INDEX_TEMPLATE = 'kibana-alerting-exec-log-index-template';
export const DESTINATION_INDEX = '.kibana-alerting-exec-log';

interface InstallTransformOpts {
  esClient: ElasticsearchClient;
  logger: Logger;
}

export const installTransform = async ({
  esClient,
  logger,
}: InstallTransformOpts): Promise<boolean> => {
  try {
    // Create template and index for transform destination
    await createComponentTemplate(esClient, logger);
    await createIndexTemplateIfNotExists(esClient, logger);
    await createConcreteIndexIfNotExists(esClient, logger);

    const success = await createTransformIfNotExists(esClient, logger);

    if (success) {
      try {
        const result = await pRetry(() => startTransformIfNotStarted(esClient, logger), {
          retries: 3,
        });
        logger.info(`startTransformIfNotStarted result ${result}`);
        return result;
      } catch (err) {
        logger.error(`Failed to start transform ${TRANSFORM_ID}`);
        return false;
      }
    }
  } catch (err) {
    logger.error(`Failed to install transform ${TRANSFORM_ID}`);
  }

  return false;
};

const createComponentTemplate = async (esClient: ElasticsearchClient, logger: Logger) => {
  logger.info(`Installing component template ${DESTINATION_COMPONENT_TEMPLATE}`);

  try {
    await esClient.cluster.putComponentTemplate({
      name: DESTINATION_COMPONENT_TEMPLATE,
      template: {
        settings: {
          number_of_shards: 1,
          'index.mapping.total_fields.limit': 200,
        },
        mappings: {
          dynamic: true,
        },
      },
    });
  } catch (err) {
    logger.error(
      `Error installing component template ${DESTINATION_COMPONENT_TEMPLATE} - ${err.message}`
    );
    throw err;
  }
};

const createIndexTemplateIfNotExists = async (esClient: ElasticsearchClient, logger: Logger) => {
  logger.info(`Installing index template ${DESTINATION_INDEX_TEMPLATE}`);

  try {
    await esClient.indices.putIndexTemplate({
      name: DESTINATION_INDEX_TEMPLATE,
      composed_of: [DESTINATION_COMPONENT_TEMPLATE],
      index_patterns: [`${DESTINATION_INDEX}*`],
    });
  } catch (err) {
    logger.error(`Error installing index template ${DESTINATION_INDEX_TEMPLATE} - ${err.message}`);
    throw err;
  }
};

const createConcreteIndexIfNotExists = async (esClient: ElasticsearchClient, logger: Logger) => {
  logger.info(`Creating concrete index ${DESTINATION_INDEX}`);

  try {
    await esClient.indices.create({
      index: DESTINATION_INDEX,
    });
  } catch (err) {
    if (err.body?.error?.type !== 'resource_already_exists_exception') {
      logger.error(`Error creating concrete index ${DESTINATION_INDEX} - ${err.message}`);
      throw err;
    }
  }
};

const createTransformIfNotExists = async (
  esClient: ElasticsearchClient,
  logger: Logger
): Promise<boolean> => {
  try {
    await esClient.transform.getTransform({
      transform_id: TRANSFORM_ID,
    });

    // transform already exists
    return true;
  } catch (getErr) {
    if (getErr.statusCode === 404) {
      logger.debug(`${TRANSFORM_ID} doesn't exist, trying to create`);
      try {
        esClient.transform.putTransform({
          ...eventLogTransform(),
          transform_id: TRANSFORM_ID,
          defer_validation: true,
          frequency: '1m',
        });

        // transform created
        logger.debug(`${TRANSFORM_ID} successfully created`);
        return true;
      } catch (createErr) {
        logger.error(`Failed to create transform ${TRANSFORM_ID}: ${createErr.message}`);
      }
    } else {
      logger.error(`Failed to check if transform ${TRANSFORM_ID} exists: ${getErr.message}`);
    }
  }
  return false;
};

const startTransformIfNotStarted = async (
  esClient: ElasticsearchClient,
  logger: Logger
): Promise<boolean> => {
  try {
    const transformStats = await esClient.transform.getTransformStats({
      transform_id: TRANSFORM_ID,
    });
    logger.info(`Transform status ${JSON.stringify(transformStats)}`);
    if (transformStats.count <= 0) {
      logger.error(`Failed starting transform ${TRANSFORM_ID}: couldn't find transform`);
      throw new Error(`Failed starting transform ${TRANSFORM_ID}: couldn't find transform`);
    }
    const fetchedTransformStats = transformStats.transforms[0];
    if (fetchedTransformStats.state === 'stopped') {
      try {
        logger.info(`${TRANSFORM_ID} stopped, trying to start`);
        const { acknowledged } = await esClient.transform.startTransform({
          transform_id: TRANSFORM_ID,
        });
        logger.info(`acknowledged ${acknowledged}`);
        return acknowledged;
      } catch (startErr) {
        logger.error(`Failed starting transform ${TRANSFORM_ID}: ${startErr.message}`);
        throw startErr;
      }
    } else if (
      fetchedTransformStats.state === 'stopping' ||
      fetchedTransformStats.state === 'aborting' ||
      fetchedTransformStats.state === 'failed'
    ) {
      logger.error(
        `Not starting transform ${TRANSFORM_ID} since it's state is: ${fetchedTransformStats.state}`
      );
      throw new Error(
        `Not starting transform ${TRANSFORM_ID} since it's state is: ${fetchedTransformStats.state}`
      );
    } else if (fetchedTransformStats.state === 'started') {
      logger.info(`Not starting transform ${TRANSFORM_ID} since it is already started`);
      return true;
    }
  } catch (statsErr) {
    logger.error(`Failed to check if transform ${TRANSFORM_ID} is started: ${statsErr.message}`);
    throw new Error(`Failed to check if transform ${TRANSFORM_ID} is started: ${statsErr.message}`);
  }

  return false;
};
