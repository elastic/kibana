/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core/server';
import type { QueryDslBoolQuery } from '@elastic/elasticsearch/lib/api/types';
import { groupBy } from 'lodash';
import type { RiskInput, SimpleRiskInput } from './types';

const buildBoolQueryForIdsOfIndex = (index: string, ids: string[]): QueryDslBoolQuery => ({
  must: { terms: { _id: ids } },
  filter: { term: { _index: index } },
});

export const retrieveRiskInputs = async ({
  esClient,
  inputs,
}: {
  esClient: ElasticsearchClient;
  inputs: SimpleRiskInput[];
}): Promise<RiskInput[]> => {
  const inputsByIndex = groupBy(inputs, '_index');
  const indices = Object.keys(inputsByIndex);

  const inputsResponse = await esClient.search({
    index: indices,
    query: {
      bool: {
        should: indices.map((index) => ({
          bool: buildBoolQueryForIdsOfIndex(
            index,
            inputsByIndex[index].map((input) => input._id)
          ),
        })),

        minimum_should_match: 1,
      },
    },
  });

  return inputsResponse.hits.hits;
};
