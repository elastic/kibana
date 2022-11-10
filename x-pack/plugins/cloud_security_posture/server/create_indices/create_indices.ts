/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { ElasticsearchClient, Logger } from '@kbn/core/server';
import { errors } from '@elastic/elasticsearch';
import {
  BENCHMARK_SCORE_INDEX_DEFAULT_NS,
  BENCHMARK_SCORE_INDEX_PATTERN,
  BENCHMARK_SCORE_INDEX_TEMPLATE_NAME,
  CLOUD_SECURITY_POSTURE_PACKAGE_NAME,
  FINDINGS_INDEX_NAME,
  LATEST_FINDINGS_INDEX_DEFAULT_NS,
  LATEST_FINDINGS_INDEX_PATTERN,
  LATEST_FINDINGS_INDEX_TEMPLATE_NAME,
} from '../../common/constants';
import { createPipelineIfNotExists } from './create_processor';
import { benchmarkScoreMapping } from './benchmark_score_mapping';
import { latestFindingsPipelineIngestConfig, scorePipelineIngestConfig } from './ingest_pipelines';

// TODO: Add integration tests

export const initializeCspIndices = async (esClient: ElasticsearchClient, logger: Logger) => {
  await Promise.all([
    createPipelineIfNotExists(esClient, scorePipelineIngestConfig, logger),
    createPipelineIfNotExists(esClient, latestFindingsPipelineIngestConfig, logger),
  ]);

  return Promise.all([
    createLatestFindingsIndex(esClient, logger),
    createBenchmarkScoreIndex(esClient, logger),
  ]);
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

    await createIndexSafe(esClient, logger, BENCHMARK_SCORE_INDEX_DEFAULT_NS);
  } catch (e) {
    logger.error(
      `Failed to upsert index template [Template: ${BENCHMARK_SCORE_INDEX_TEMPLATE_NAME}]`
    );
    logger.error(e);
  }
};

const createLatestFindingsIndex = async (esClient: ElasticsearchClient, logger: Logger) => {
  try {
    // Deletes old assets from previous versions as part of upgrade process
    const INDEX_TEMPLATE_V830 = 'cloud_security_posture.findings_latest';
    await deleteIndexTemplateSafe(esClient, logger, INDEX_TEMPLATE_V830);

    // We want that our latest findings index template would be identical to the findings index template
    const findingsIndexTemplateResponse = await esClient.indices.getIndexTemplate({
      name: FINDINGS_INDEX_NAME,
    });
    // eslint-disable-next-line @typescript-eslint/naming-convention
    const { template, composed_of, _meta } =
      findingsIndexTemplateResponse.index_templates[0].index_template;

    // We always want to keep the index template updated
    await esClient.indices.putIndexTemplate({
      name: LATEST_FINDINGS_INDEX_TEMPLATE_NAME,
      index_patterns: LATEST_FINDINGS_INDEX_PATTERN,
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
      composed_of,
    });

    await createIndexSafe(esClient, logger, LATEST_FINDINGS_INDEX_DEFAULT_NS);
  } catch (e) {
    logger.error(
      `Failed to upsert index template [Template: ${LATEST_FINDINGS_INDEX_TEMPLATE_NAME}]`
    );
    logger.error(e);
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
    } else {
      logger.trace(`Index already exists [Name: ${index}]`);
    }
  } catch (e) {
    logger.error(`Failed to create index [Name: ${index}]`);
    logger.error(e);
  }
};
