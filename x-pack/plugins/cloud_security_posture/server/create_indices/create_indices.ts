/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { ElasticsearchClient, Logger } from '@kbn/core/server';
import {
  BENCHMARK_SCORE_INDEX_DEFAULT_NS,
  BENCHMARK_SCORE_INDEX_PATTERN,
  BENCHMARK_SCORE_INDEX_TEMPLATE_NAME,
  CLOUD_SECURITY_POSTURE_PACKAGE_NAME,
  CSP_INGEST_TIMESTAMP_PIPELINE,
  FINDINGS_INDEX_NAME,
  LATEST_FINDINGS_INDEX_DEFAULT_NS,
  LATEST_FINDINGS_INDEX_PATTERN,
  LATEST_FINDINGS_INDEX_TEMPLATE_NAME,
} from '../../common/constants';
import { createPipelineIfNotExists } from './create_processor';
import { benchmarkScoreMapping } from './benchmark_score_mapping';

// TODO: Add integration tests

export const initializeCspIndices = async (esClient: ElasticsearchClient, logger: Logger) => {
  await createPipelineIfNotExists(esClient, CSP_INGEST_TIMESTAMP_PIPELINE, logger);

  return Promise.all([
    createLatestFindingsIndex(esClient, logger),
    createBenchmarkScoreIndex(esClient, logger),
  ]);
};

const createBenchmarkScoreIndex = async (esClient: ElasticsearchClient, logger: Logger) => {
  try {
    // We always want to keep the index template updated
    await esClient.indices.putIndexTemplate({
      name: BENCHMARK_SCORE_INDEX_TEMPLATE_NAME,
      index_patterns: BENCHMARK_SCORE_INDEX_PATTERN,
      template: {
        mappings: benchmarkScoreMapping,
        settings: {
          default_pipeline: CSP_INGEST_TIMESTAMP_PIPELINE,
          lifecycle: {
            // This is the default lifecycle name, it is named on the data-stream type (e.g, logs/ metrics)
            name: 'logs',
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
    // We want that our latest findings index template would be identical to the findings index template
    const findingsIndexTemplateResponse = await esClient.indices.getIndexTemplate({
      name: FINDINGS_INDEX_NAME,
    });
    // eslint-disable-next-line @typescript-eslint/naming-convention
    const { template, composed_of, _meta } =
      findingsIndexTemplateResponse.index_templates[0].index_template;

    if (template?.settings) {
      template.settings.lifecycle = {
        name: '',
      };
    }

    // We always want to keep the index template updated
    await esClient.indices.putIndexTemplate({
      name: LATEST_FINDINGS_INDEX_TEMPLATE_NAME,
      index_patterns: LATEST_FINDINGS_INDEX_PATTERN,
      priority: 500,
      _meta,
      composed_of,
      template,
    });

    await createIndexSafe(esClient, logger, LATEST_FINDINGS_INDEX_DEFAULT_NS);
  } catch (e) {
    logger.error(
      `Failed to upsert index template [Template: ${LATEST_FINDINGS_INDEX_TEMPLATE_NAME}]`
    );
    logger.error(e);
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
    }
  } catch (e) {
    logger.error(`Failed to create index [Index: ${index}]`);
    logger.error(e);
  }
};
