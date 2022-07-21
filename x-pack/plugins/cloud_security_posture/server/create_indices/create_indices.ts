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
  BENCHMARK_SCORE_INDEX_PATTERN,
  BENCHMARK_SCORE_INDEX_DEFAULT_NS,
  CSP_INGEST_TIMESTAMP_PIPELINE,
  LATEST_FINDINGS_INDEX_TEMPLATE_NAME,
  LATEST_FINDINGS_INDEX_PATTERN,
  BENCHMARK_SCORE_INDEX_TEMPLATE_NAME,
  CLOUD_SECURITY_POSTURE_PACKAGE_NAME,
} from '../../common/constants';
import { createPipelineIfNotExists } from './create_processor';

// TODO: Add integration tests

export const initializeCspIndices = async (esClient: ElasticsearchClient, logger: Logger) => {
  await createPipelineIfNotExists(esClient, CSP_INGEST_TIMESTAMP_PIPELINE, logger);

  return Promise.all([
    createLatestFindingsIndex(esClient, logger),
    createIndexIfNotExists({
      esClient,
      index: BENCHMARK_SCORE_INDEX_DEFAULT_NS,
      indexTemplateName: BENCHMARK_SCORE_INDEX_TEMPLATE_NAME,
      indexPattern: BENCHMARK_SCORE_INDEX_PATTERN,
      mappings: benchmarkScoreMapping,
      settings: { default_pipeline: CSP_INGEST_TIMESTAMP_PIPELINE },
      logger,
    }),
  ]);
};

interface CreateIndexIfNotExistsParams {
  esClient: ElasticsearchClient;
  index: string;
  indexTemplateName: string;
  indexPattern: string;
  mappings: MappingTypeMapping;
  settings: IndicesIndexSettings;
  logger: Logger;
}

export const createIndexIfNotExists = async ({
  esClient,
  index,
  indexTemplateName,
  indexPattern,
  mappings,
  settings,
  logger,
}: CreateIndexIfNotExistsParams) => {
  try {
    // We always want to keep the index template updated
    await esClient.indices.putIndexTemplate({
      name: indexTemplateName,
      index_patterns: indexPattern,
      template: { mappings },
      _meta: {
        package: {
          name: CLOUD_SECURITY_POSTURE_PACKAGE_NAME,
        },
        managed_by: 'cloud_security_posture',
        managed: true,
      },
      priority: 500,
    });

    const isLatestIndexExists = await esClient.indices.exists({
      index,
    });
    if (!isLatestIndexExists) {
      await esClient.indices.create({
        index,
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

const createLatestFindingsIndex = async (esClient: ElasticsearchClient, logger: Logger) => {
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

  try {
    const isLatestIndexExists = await esClient.indices.exists({
      index: LATEST_FINDINGS_INDEX_DEFAULT_NS,
    });

    if (isLatestIndexExists) {
      return;
    }

    await esClient.indices.create({
      index: LATEST_FINDINGS_INDEX_DEFAULT_NS,
    });
  } catch (e) {
    logger.warn('Failed to create latest findings index');
    logger.warn(e);
  }
};
