/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ElasticsearchClient } from '@kbn/core-elasticsearch-server';
import { IUiSettingsClient } from '@kbn/core-ui-settings-server';
import { isEmpty } from 'lodash';
import type { Logger } from '@kbn/logging';
import { RecalledEntry } from '.';
import { aiAssistantSearchConnectorIndexPattern } from '../../../common';

export async function recallFromConnectors({
  queries,
  esClient,
  uiSettingsClient,
  modelId,
  logger,
}: {
  queries: Array<{ text: string; boost?: number }>;
  esClient: { asCurrentUser: ElasticsearchClient; asInternalUser: ElasticsearchClient };
  uiSettingsClient: IUiSettingsClient;
  modelId: string;
  logger: Logger;
}): Promise<RecalledEntry[]> {
  const ML_INFERENCE_PREFIX = 'ml.inference.';
  const connectorIndices = await getConnectorIndices(esClient, uiSettingsClient, logger);
  logger.debug(`Found connector indices: ${connectorIndices}`);

  const fieldCaps = await esClient.asCurrentUser.fieldCaps({
    index: connectorIndices,
    fields: `${ML_INFERENCE_PREFIX}*`,
    allow_no_indices: true,
    types: ['sparse_vector'],
    filters: '-metadata,-parent',
  });

  const fieldsWithVectors = Object.keys(fieldCaps.fields).map((field) =>
    field.replace('_expanded.predicted_value', '').replace(ML_INFERENCE_PREFIX, '')
  );

  if (!fieldsWithVectors.length) {
    return [];
  }

  const esQueries = fieldsWithVectors.flatMap((field) => {
    const vectorField = `${ML_INFERENCE_PREFIX}${field}_expanded.predicted_value`;
    const modelField = `${ML_INFERENCE_PREFIX}${field}_expanded.model_id`;

    return queries.map(({ text, boost = 1 }) => {
      return {
        bool: {
          should: [
            {
              text_expansion: {
                [vectorField]: {
                  model_text: text,
                  model_id: modelId,
                  boost,
                },
              },
            },
          ],
          filter: [
            {
              term: {
                [modelField]: modelId,
              },
            },
          ],
        },
      };
    });
  });

  const response = await esClient.asCurrentUser.search<unknown>({
    index: connectorIndices,
    query: {
      bool: {
        should: esQueries,
      },
    },
    size: 20,
    _source: {
      exclude: ['_*', 'ml*'],
    },
  });

  const results = response.hits.hits.map((hit) => ({
    text: JSON.stringify(hit._source),
    score: hit._score!,
    is_correction: false,
    id: hit._id!,
  }));

  return results;
}

async function getConnectorIndices(
  esClient: { asCurrentUser: ElasticsearchClient; asInternalUser: ElasticsearchClient },
  uiSettingsClient: IUiSettingsClient,
  logger: Logger
) {
  // improve performance by running this in parallel with the `uiSettingsClient` request
  const responsePromise = esClient.asInternalUser.transport
    .request<{
      results?: Array<{ index_name: string }>;
    }>({
      method: 'GET',
      path: '_connector',
      querystring: {
        filter_path: 'results.index_name',
      },
    })
    .catch((e) => {
      logger.warn(`Failed to fetch connector indices due to ${e.message}`);
      return { results: [] };
    });

  const customSearchConnectorIndex = await uiSettingsClient.get<string>(
    aiAssistantSearchConnectorIndexPattern
  );

  if (customSearchConnectorIndex) {
    return customSearchConnectorIndex.split(',');
  }

  const response = await responsePromise;
  const connectorIndices = response.results?.map((result) => result.index_name);

  // preserve backwards compatibility with 8.14 (may not be needed in the future)
  if (isEmpty(connectorIndices)) {
    return ['search-*'];
  }

  return connectorIndices;
}
