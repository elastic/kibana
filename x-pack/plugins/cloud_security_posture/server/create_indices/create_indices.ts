/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { ElasticsearchClient, Logger } from '@kbn/core/server';
import { errors } from '@elastic/elasticsearch';
import type { MappingTypeMapping } from '@elastic/elasticsearch/lib/api/types';

import {
  BENCHMARK_SCORE_INDEX_DEFAULT_NS,
  BENCHMARK_SCORE_INDEX_PATTERN,
  BENCHMARK_SCORE_INDEX_TEMPLATE_NAME,
  CLOUD_SECURITY_POSTURE_PACKAGE_NAME,
} from '../../common/constants';
import { createPipelineIfNotExists } from './create_processor';
import { benchmarkScoreMapping } from './benchmark_score_mapping';
import { latestFindingsPipelineIngestConfig, scorePipelineIngestConfig } from './ingest_pipelines';
import { latestIndexConfigs } from './latest_indices';
import { IndexConfig, IndexTemplateParams } from './types';

// TODO: Add integration tests
export const initializeCspIndices = async (esClient: ElasticsearchClient, logger: Logger) => {
  await Promise.allSettled([
    createPipelineIfNotExists(esClient, scorePipelineIngestConfig, logger),
    createPipelineIfNotExists(esClient, latestFindingsPipelineIngestConfig, logger),
  ]);

  const [
    createFindingsLatestIndexPromise,
    createVulnerabilitiesLatestIndexPromise,
    createBenchmarkScoreIndexPromise,
  ] = await Promise.allSettled([
    createLatestIndex(esClient, logger, latestIndexConfigs.findings),
    createLatestIndex(esClient, logger, latestIndexConfigs.vulnerabilities),
    createBenchmarkScoreIndex(esClient, logger),
  ]);

  if (createFindingsLatestIndexPromise.status === 'rejected') {
    logger.error(createFindingsLatestIndexPromise.reason);
  }
  if (createVulnerabilitiesLatestIndexPromise.status === 'rejected') {
    logger.error(createVulnerabilitiesLatestIndexPromise.reason);
  }
  if (createBenchmarkScoreIndexPromise.status === 'rejected') {
    logger.error(createBenchmarkScoreIndexPromise.reason);
  }
};

const createBenchmarkScoreIndex = async (esClient: ElasticsearchClient, logger: Logger) => {
  try {
    // Deletes old assets from previous versions as part of upgrade process
    const INDEX_TEMPLATE_V830 = 'cloud_security_posture.scores';
    await deleteIndexTemplateSafe(esClient, logger, INDEX_TEMPLATE_V830);

    // We always want to keep the index template updated
    await esClient.indices.putIndexTemplate({
      name: BENCHMARK_SCORE_INDEX_TEMPLATE_NAME,
      index_patterns: BENCHMARK_SCORE_INDEX_PATTERN,
      template: {
        mappings: benchmarkScoreMapping,
        settings: {
          default_pipeline: scorePipelineIngestConfig.id,
          // TODO: once we will convert the score index to datastream we will no longer override the ilm to be empty
          lifecycle: {
            name: '',
          },
        },
      },
      _meta: {
        package: {
          name: CLOUD_SECURITY_POSTURE_PACKAGE_NAME,
        },
        managed_by: 'cloud_security_posture',
        managed: true,
      },
      priority: 500,
    });

    const result = await createIndexSafe(esClient, logger, BENCHMARK_SCORE_INDEX_DEFAULT_NS);

    if (result === 'already-exists') {
      await updateIndexSafe(
        esClient,
        logger,
        BENCHMARK_SCORE_INDEX_DEFAULT_NS,
        benchmarkScoreMapping
      );
    }
  } catch (e) {
    logger.error(e);
    throw Error(
      `Failed to upsert index template [Template: ${BENCHMARK_SCORE_INDEX_TEMPLATE_NAME}]`
    );
  }
};

const createLatestIndex = async (
  esClient: ElasticsearchClient,
  logger: Logger,
  indexConfig: IndexConfig
) => {
  const { indexName, indexPattern, indexTemplateName, indexDefaultName } = indexConfig;
  try {
    // We want that our latest findings index template would be identical to the findings index template
    const indexTemplateResponse = await esClient.indices.getIndexTemplate({
      name: indexName,
    });

    // eslint-disable-next-line @typescript-eslint/naming-convention
    const { template, composed_of, _meta } =
      indexTemplateResponse.index_templates[0].index_template;

    const indexTemplateParams = {
      template,
      composedOf: composed_of,
      _meta,
      indexTemplateName,
      indexPattern,
    };

    // We always want to keep the index template updated
    await updateIndexTemplate(esClient, logger, indexTemplateParams);

    const result = await createIndexSafe(esClient, logger, indexDefaultName);

    if (result === 'already-exists') {
      // Make sure mappings are up-to-date
      const simulateResponse = await esClient.indices.simulateTemplate({
        name: indexTemplateName,
      });

      await updateIndexSafe(esClient, logger, indexDefaultName, simulateResponse.template.mappings);
    }
  } catch (e) {
    logger.error(e);
    throw Error(`Failed to upsert index template [Template: ${indexTemplateName}]`);
  }
};

const deleteIndexTemplateSafe = async (
  esClient: ElasticsearchClient,
  logger: Logger,
  name: string
) => {
  try {
    const resp = await esClient.indices.getIndexTemplate({
      name,
    });

    if (resp.index_templates) {
      await esClient.indices.deleteIndexTemplate({
        name,
      });

      logger.info(`Deleted index template successfully [Name: ${name}]`);
    }
  } catch (e) {
    if (e instanceof errors.ResponseError && e.statusCode === 404) {
      logger.trace(`Index template no longer exists [Name: ${name}]`);
    } else {
      logger.error(`Failed to delete index template [Name: ${name}]`);
      logger.error(e);
    }
  }
};

const createIndexSafe = async (esClient: ElasticsearchClient, logger: Logger, index: string) => {
  try {
    const isLatestIndexExists = await esClient.indices.exists({
      index,
    });

    if (!isLatestIndexExists) {
      await esClient.indices.create({
        index,
      });

      logger.info(`Created index successfully [Name: ${index}]`);
      return 'success';
    } else {
      logger.trace(`Index already exists [Name: ${index}]`);
      return 'already-exists';
    }
  } catch (e) {
    logger.error(`Failed to create index [Name: ${index}]`);
    logger.error(e);
    return 'fail';
  }
};

const updateIndexTemplate = async (
  esClient: ElasticsearchClient,
  logger: Logger,
  indexTemplateParams: IndexTemplateParams
) => {
  const { indexTemplateName, indexPattern, template, composedOf, _meta } = indexTemplateParams;
  try {
    await esClient.indices.putIndexTemplate({
      name: indexTemplateName,
      index_patterns: indexPattern,
      priority: 500,
      template: {
        mappings: template?.mappings,
        settings: {
          ...template?.settings,
          default_pipeline: latestFindingsPipelineIngestConfig.id,
          lifecycle: {
            name: '',
          },
        },
        aliases: template?.aliases,
      },
      _meta,
      composed_of: composedOf,
    });
    logger.info(`Updated index template successfully [Name: ${indexTemplateName}]`);
  } catch (e) {
    logger.error(`Failed to update index template [Name: ${indexTemplateName}]`);
    logger.error(e);
  }
};

const updateIndexSafe = async (
  esClient: ElasticsearchClient,
  logger: Logger,
  index: string,
  mappings: MappingTypeMapping
) => {
  // for now, remove from object so as not to update stream or data stream properties of the index until type and name
  // are added in https://github.com/elastic/kibana/issues/66551.  namespace value we will continue
  // to skip updating and assume the value in the index mapping is correct
  if (mappings && mappings.properties) {
    delete mappings.properties.stream;
    delete mappings.properties.data_stream;
  }
  try {
    await esClient.indices.putMapping({
      index,
      properties: mappings.properties,
    });
    logger.info(`Updated index successfully [Name: ${index}]`);
  } catch (e) {
    logger.error(`Failed to update index [Name: ${index}]`);
    logger.error(e);
  }
};
