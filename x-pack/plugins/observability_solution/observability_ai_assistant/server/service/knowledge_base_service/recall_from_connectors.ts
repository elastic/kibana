/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ElasticsearchClient } from '@kbn/core-elasticsearch-server';
import { IUiSettingsClient } from '@kbn/core-ui-settings-server';
import { isEmpty } from 'lodash';
import { RecalledEntry } from '.';
import { aiAssistantSearchConnectorIndexPattern } from '../../../common';

export async function recallFromConnectors({
  queries,
  esClient,
  uiSettingsClient,
}: {
  queries: Array<{ text: string; boost?: number }>;
  esClient: { asCurrentUser: ElasticsearchClient };
  uiSettingsClient: IUiSettingsClient;
}): Promise<RecalledEntry[]> {
  const connectorIndices = await getConnectorIndices(esClient, uiSettingsClient);

  const fieldCaps = await esClient.asCurrentUser.fieldCaps({
    index: connectorIndices,
    fields: `ml.inference.`,
    allow_no_indices: true,
    types: ['sparse_vector'],
    filters: '-metadata,-parent',
  });

  const vectorFieldNames = Object.keys(fieldCaps.fields);
  const inferenceQueries = getInferenceQueries({ vectorFieldNames, queries });

  const response = await esClient.asCurrentUser.search<unknown>({
    index: connectorIndices,
    query: {
      bool: {
        should: inferenceQueries,
      },
    },
    size: 20,
    _source: {
      exclude: ['_*', 'ml*'],
    },
  });

  return response.hits.hits.map((hit) => ({
    text: JSON.stringify(hit._source),
    score: hit._score!,
    is_correction: false,
    id: hit._id,
  }));
}

export function getInferenceQueries({
  vectorFieldNames,
  queries,
}: {
  vectorFieldNames: string[];
  queries: Array<{ text: string; boost?: number }>;
}) {
  if (!vectorFieldNames.length) {
    return [];
  }

  // vectorField.replace('.chunks.embeddings', '.inference_id'); // title.inference.chunks.embeddings -> title.inference.inference_id
  const modelId = '.elser_model_2'; // only support elser model for now (no E5 support)

  return vectorFieldNames.flatMap((vectorField) => {
    const modelField = vectorField.replace('.predicted_value', '.model_id'); // ml.inference.title_expanded.predicted_value -> ml.inference.title_expanded.model_id

    return queries.map(({ text, boost = 1 }) => {
      return {
        bool: {
          filter: [{ term: { [modelField]: modelId } }],
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
        },
      };
    });
  });
}

async function getConnectorIndices(
  esClient: { asCurrentUser: ElasticsearchClient },
  uiSettingsClient: IUiSettingsClient
) {
  // improve performance by running this in parallel with the `uiSettingsClient` request
  const responsePromise = esClient.asCurrentUser.transport.request({
    method: 'GET',
    path: '_connector',
    querystring: {
      filter_path: 'results.index_name',
    },
  });

  const customSearchConnectorIndex = await uiSettingsClient.get<string>(
    aiAssistantSearchConnectorIndexPattern
  );

  if (customSearchConnectorIndex) {
    return customSearchConnectorIndex.split(',');
  }

  const response = (await responsePromise) as { results?: Array<{ index_name: string }> };
  const connectorIndices = response.results?.map((result) => result.index_name);

  // preserve backwards compatibility with 8.14 (may not be needed in the future)
  if (isEmpty(connectorIndices)) {
    return ['search-*'];
  }

  return connectorIndices;
}
