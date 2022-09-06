/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { transformError } from '@kbn/securitysolution-es-utils';
import { IndicesIndexSettings, MappingTypeMapping } from '@elastic/elasticsearch/lib/api/types';
import type { ElasticsearchClient, Logger } from '@kbn/core/server';
import { benchmarkScoreMapping } from './benchmark_score_mapping';
import { latestFindingsMapping } from './latest_findings_mapping';
import {
  LATEST_FINDINGS_INDEX_DEFAULT_NS,
  LATEST_FINDINGS_INDEX_NAME,
  BENCHMARK_SCORE_INDEX_DEFAULT_NS,
  BENCHMARK_SCORE_INDEX_NAME,
  CSP_INGEST_TIMESTAMP_PIPELINE,
} from '../../common/constants';
import { createPipelineIfNotExists } from './create_processor';

// TODO: Add integration tests
export const initializeCspIndices = async (esClient: ElasticsearchClient, logger: Logger) => {
  await createPipelineIfNotExists(esClient, CSP_INGEST_TIMESTAMP_PIPELINE, logger);
  return Promise.all([
    createIndexIfNotExists(
      esClient,
      LATEST_FINDINGS_INDEX_NAME,
      LATEST_FINDINGS_INDEX_DEFAULT_NS,
      latestFindingsMapping,
      {},
      logger
    ),
    createIndexIfNotExists(
      esClient,
      BENCHMARK_SCORE_INDEX_NAME,
      BENCHMARK_SCORE_INDEX_DEFAULT_NS,
      benchmarkScoreMapping,
      { default_pipeline: CSP_INGEST_TIMESTAMP_PIPELINE },
      logger
    ),
  ]);
};

export const createIndexIfNotExists = async (
  esClient: ElasticsearchClient,
  indexTemplateName: string,
  indexPattern: string,
  mappings: MappingTypeMapping,
  settings: IndicesIndexSettings,
  logger: Logger
) => {
  try {
    const isLatestIndexExists = await esClient.indices.exists({
      index: indexPattern,
    });

    if (!isLatestIndexExists) {
      await esClient.indices.putIndexTemplate({
        name: indexTemplateName,
        index_patterns: indexPattern,
        template: { mappings },
        priority: 500,
      });
      await esClient.indices.create({
        index: indexPattern,
        mappings,
        settings,
      });
    }
  } catch (err) {
    const error = transformError(err);
    logger.error(`Failed to create the index template: ${indexTemplateName}`);
    logger.error(error.message);
  }
};
