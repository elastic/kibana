/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { from } from 'rxjs';
import {
  ISearchStrategy,
  SearchStrategyDependencies,
} from '../../../../../../src/plugins/data/server';
import {
  OpenIndexPatternStrategyResponse,
  OpenIndexPatternStrategyRequest,
} from '../../../common/search_strategy/open_index_pattern';

export const securitySolutionOpenIndexPatternProvider = (): ISearchStrategy<
  OpenIndexPatternStrategyRequest,
  OpenIndexPatternStrategyResponse
> => {
  return {
    search: (request, options, deps) => from(requestOpenIndexPatternSearch(request, deps)),
  };
};

// TODO paginate it
// TODO search all input indices
// QUESTION: What is a search strategy and why do we need 4 of them?

export const requestOpenIndexPatternSearch = async (
  request: OpenIndexPatternStrategyRequest,
  { esClient }: SearchStrategyDependencies
): Promise<OpenIndexPatternStrategyResponse> => {
  const PER_PAGE = 1; // TODO how many items per page? 100?

  const searchResponse = await esClient.asCurrentUser.search({
    index: request.indices[0], // TODO support many indices
    body: {
      size: 0,
      query: {
        exists: {
          field: 'destination.geo.location',
        },
      },
      aggs: {
        data_streams: {
          composite: {
            size: PER_PAGE,
            sources: [
              { dataset: { terms: { field: 'data_stream.dataset' } } },
              { namespace: { terms: { field: 'data_stream.namespace' } } },
              { type: { terms: { field: 'data_stream.type' } } },
            ],
          },
        },
      },
    },
  });

  interface DataStreamsAggResponse {
    aggregations: {
      data_streams: {
        after_key: DataStreamAgg;
        buckets: Array<{
          key: DataStreamAgg;
        }>;
      };
    };
  }

  interface DataStreamAgg {
    dataset: string;
    namespace: string;
    type: string;
  }

  // @ts-expect-error @elastic/elasticsearch no way to declare a type for aggregation in the search response
  const body = searchResponse.body as DataStreamsAggResponse;

  if (body.aggregations.data_streams.buckets.length === PER_PAGE) {
    const after = body.aggregations.data_streams.after_key;
    console.log('it has more pages', after); // TODO
  }

  const indexFields = body.aggregations.data_streams.buckets.map(
    ({ key: { dataset, namespace, type } }) => `${type}-${dataset}-${namespace}*`
  );

  console.log(indexFields);

  // QUESTION: Why this response format is required?

  return {
    indexFields,
    rawResponse: {
      timed_out: false,
      took: -1,
      _shards: {
        total: -1,
        successful: -1,
        failed: -1,
        skipped: -1,
      },
      hits: {
        total: -1,
        max_score: -1,
        hits: [
          {
            _index: '',
            _type: '',
            _id: '',
            _score: -1,
            _source: null,
          },
        ],
      },
    },
  };
};
