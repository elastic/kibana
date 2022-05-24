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
export const initializeCspTransformsIndices = async (
  esClient: ElasticsearchClient,
  logger: Logger
) => {
  return Promise.all([
    createLatestFindingsIndex(
      esClient,
      LATEST_FINDINGS_INDEX_NAME,
      LATEST_FINDINGS_INDEX_DEFAULT_NS,
      latestFindingsMapping,
      logger
    ),
    createBenchmarkScoreIndex(
      esClient,
      BENCHMARK_SCORE_INDEX_NAME,
      BENCHMARK_SCORE_INDEX_DEFAULT_NS,
      benchmarkScoreMapping,
      logger
    ),
  ]);
};

const createLatestFindingsIndex = async (
  esClient: ElasticsearchClient,
  indexTemplateName: string,
  indexPattern: string,
  mappings: MappingTypeMapping,
  logger: Logger
) => {
  createIndexIfNotExists(esClient, indexTemplateName, indexPattern, mappings, {}, logger);
};

const createBenchmarkScoreIndex = async (
  esClient: ElasticsearchClient,
  indexTemplateName: string,
  indexPattern: string,
  mappings: MappingTypeMapping,
  logger: Logger
) => {
  const createPipelineResponse = await createPipelineIfNotExists(
    esClient,
    CSP_INGEST_TIMESTAMP_PIPELINE,
    logger
  );
  if (createPipelineResponse) {
    const createScoreIndexSettings = { default_pipeline: CSP_INGEST_TIMESTAMP_PIPELINE };
    createIndexIfNotExists(
      esClient,
      indexTemplateName,
      indexPattern,
      mappings,
      createScoreIndexSettings,
      logger
    );
  }
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
    logger.error(`Failed to create the index: ${indexTemplateName}`);
    logger.error(error.message);
  }
};
