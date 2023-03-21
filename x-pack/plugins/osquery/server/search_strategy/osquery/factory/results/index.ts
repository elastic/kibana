/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IEsSearchResponse } from '@kbn/data-plugin/common';
import { DEFAULT_MAX_TABLE_QUERY_SIZE } from '../../../../../common/constants';
import type {
  ResultsStrategyResponse,
  ResultsRequestOptions,
  OsqueryQueries,
} from '../../../../../common/search_strategy/osquery';
import { inspectStringifyObject } from '../../../../../common/utils/build_query';
import type { OsqueryFactory } from '../types';
import { buildResultsQuery } from './query.all_results.dsl';

export const allResults: OsqueryFactory<OsqueryQueries.results> = {
  buildDsl: (options: ResultsRequestOptions) => {
    if (options.pagination && options.pagination.querySize >= DEFAULT_MAX_TABLE_QUERY_SIZE) {
      throw new Error(`No query size above ${DEFAULT_MAX_TABLE_QUERY_SIZE}`);
    }

    return buildResultsQuery(options);
  },
  parse: async (
    options: ResultsRequestOptions,
    response: IEsSearchResponse<unknown>
  ): Promise<ResultsStrategyResponse> => {
    const inspect = {
      dsl: [inspectStringifyObject(buildResultsQuery(options))],
    };

    return {
      ...response,
      inspect,
      edges: response.rawResponse.hits.hits,
    };
  },
};
