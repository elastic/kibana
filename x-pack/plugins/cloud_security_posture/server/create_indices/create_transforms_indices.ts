/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { transformError } from '@kbn/securitysolution-es-utils';
import { MappingTypeMapping } from '@elastic/elasticsearch/lib/api/types';
import type { ElasticsearchClient, Logger } from '@kbn/core/server';
import { benchmarkScoreMapping } from './benchmark_score_mapping';
import { latestFindingsMapping } from './latest_findings_mapping';
import {
  LATEST_FINDINGS_INDEX_PATTERN,
  LATEST_FINDINGS_INDEX_NAME,
  BENCHMARK_SCORE_INDEX_PATTERN,
  BENCHMARK_SCORE_INDEX_NAME,
} from '../../common/constants';

// TODO: Add integration tests
export const initializeCspTransformsIndices = async (
  esClient: ElasticsearchClient,
  logger: Logger
) => {
  createIndexIfNotExists(
    esClient,
    LATEST_FINDINGS_INDEX_NAME,
    LATEST_FINDINGS_INDEX_PATTERN,
    latestFindingsMapping,
    logger
  );
  createIndexIfNotExists(
    esClient,
    BENCHMARK_SCORE_INDEX_NAME,
    BENCHMARK_SCORE_INDEX_PATTERN,
    benchmarkScoreMapping,
    logger
  );
};

export const createIndexIfNotExists = async (
  esClient: ElasticsearchClient,
  indexName: string,
  indexPattern: string,
  mappings: MappingTypeMapping,
  logger: Logger
) => {
  try {
    const isLatestIndexExists = await esClient.indices.exists({
      index: indexPattern,
    });

    if (!isLatestIndexExists) {
      await esClient.indices.putIndexTemplate({
        name: indexName,
        index_patterns: indexPattern,
        template: { mappings },
        priority: 500,
      });
      await esClient.indices.create({
        index: indexPattern,
        mappings,
      });
    }
  } catch (err) {
    const error = transformError(err);
    logger.error(`Failed to create ${LATEST_FINDINGS_INDEX_PATTERN}`);
    logger.error(error.message);
  }
};
