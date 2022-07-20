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
import {
  FINDINGS_INDEX_NAME,
  LATEST_FINDINGS_INDEX_DEFAULT_NS,
  BENCHMARK_SCORE_INDEX_DEFAULT_NS,
  BENCHMARK_SCORE_INDEX_NAME,
  CSP_INGEST_TIMESTAMP_PIPELINE,
  LATEST_FINDINGS_INDEX_NAME,
} from '../../common/constants';
import { createPipelineIfNotExists } from './create_processor';

// TODO: Add integration tests

export const initializeCspIndices = async (esClient: ElasticsearchClient, logger: Logger) => {
  await createPipelineIfNotExists(esClient, CSP_INGEST_TIMESTAMP_PIPELINE, logger);

  return Promise.all([
    createLatestFindingsIndex(esClient, logger),
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

const createLatestFindingsIndex = async (esClient, logger) => {
  const isLatestIndexExists = await esClient.indices.exists({
    index: LATEST_FINDINGS_INDEX_DEFAULT_NS,
  });

  if (isLatestIndexExists) {
    return;
  }

  // We fetch the index template of the findings data stream to clone the mapping to the latest findings
  const findingsIndexTemplateResponse = await esClient.indices.getIndexTemplate({
    name: FINDINGS_INDEX_NAME,
  });
  const latestFindingsIndexTemplate = { ...findingsIndexTemplateResponse.index_templates[0] };
  latestFindingsIndexTemplate.index_template.index_patterns = LATEST_FINDINGS_INDEX_DEFAULT_NS;
  latestFindingsIndexTemplate.index_template.priority = 500;
  delete latestFindingsIndexTemplate.index_template.data_stream;

  await esClient.indices.putIndexTemplate({
    name: LATEST_FINDINGS_INDEX_NAME,
    body: latestFindingsIndexTemplate.index_template,
  });

  try {
    await esClient.indices.create({
      index: LATEST_FINDINGS_INDEX_DEFAULT_NS,
      settings: {},
    });
  } catch (e) {
    logger.warn('Failed to create latest findings index');
    logger.warn(e);
  }
};
