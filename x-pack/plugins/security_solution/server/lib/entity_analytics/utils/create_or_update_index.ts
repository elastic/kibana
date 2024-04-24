/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { ElasticsearchClient, Logger } from '@kbn/core/server';
import { transformError } from '@kbn/securitysolution-es-utils';
import type {
  IndicesCreateRequest,
  IndicesCreateResponse,
  IndicesPutIndexTemplateRequest,
} from '@elastic/elasticsearch/lib/api/types';
import { retryTransientEsErrors } from './retry_transient_es_errors';

/**
 * It's check for index existatnce, and create index
 * or update existing index mappings
 */
export const createOrUpdateIndex = async ({
  esClient,
  logger,
  options,
}: {
  esClient: ElasticsearchClient;
  logger: Logger;
  options: IndicesCreateRequest;
}): Promise<IndicesCreateResponse | void> => {
  try {
    const isIndexExist = await esClient.indices.exists({
      index: options.index,
    });
    if (isIndexExist) {
      const response = await esClient.indices.get({
        index: options.index,
      });
      const indices = Object.keys(response ?? {});
      logger.info(`${options.index} already exist`);
      if (options.mappings) {
        await Promise.all(
          indices.map(async (index) => {
            try {
              await retryTransientEsErrors(
                () => esClient.indices.putMapping({ index, body: options.mappings }),
                { logger }
              );
              logger.info(`Update mappings for ${index}`);
            } catch (err) {
              logger.error(`Failed to PUT mapping for index ${index}: ${err.message}`);
            }
          })
        );
      }
    } else {
      return esClient.indices.create(options);
    }
  } catch (err) {
    const error = transformError(err);
    const fullErrorMessage = `Failed to create index: ${options.index}: ${error.message}`;
    logger.error(fullErrorMessage);
    throw new Error(fullErrorMessage);
  }
};

export const createOrUpdateDatastream = async ({
  esClient,
  logger,
  template,
  name,
}: {
  esClient: ElasticsearchClient;
  logger: Logger;
  template: IndicesPutIndexTemplateRequest;
  name: string;
}): Promise<{
  created: boolean;
}> => {
  console.log(JSON.stringify(template));
  if (!template?.index_patterns?.length) {
    throw new Error('Datastream template must have at least one index pattern');
  }
  try {
    await esClient.indices.putIndexTemplate(template);

    const createResult = await esClient.indices
      .createDataStream({
        name,
      })
      .catch((err) => {
        // TODO: some error handling here
        logger.warn(`Failed to create datastream: ${name}: ${err.message}`);
      });

    return {
      created: createResult?.acknowledged || false,
    };
  } catch (err) {
    const error = transformError(err);
    const fullErrorMessage = `Failed to create datastream: ${name}: ${error.message}`;
    logger.error(fullErrorMessage);
    throw new Error(fullErrorMessage);
  }
};
