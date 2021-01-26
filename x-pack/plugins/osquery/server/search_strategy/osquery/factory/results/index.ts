/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { IEsSearchResponse } from '../../../../../../../../src/plugins/data/common';
import { DEFAULT_MAX_TABLE_QUERY_SIZE } from '../../../../../common/constants';
import {
  ResultsStrategyResponse,
  ResultsRequestOptions,
  OsqueryQueries,
} from '../../../../../common/search_strategy/osquery';
import { inspectStringifyObject } from '../../../../../common/utils/build_query';
import { OsqueryFactory } from '../types';
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
    const { activePage } = options.pagination;
    const inspect = {
      dsl: [inspectStringifyObject(buildResultsQuery(options))],
    };

    return {
      ...response,
      inspect,
      edges: response.rawResponse.hits.hits,
      totalCount: response.rawResponse.hits.total,
      pageInfo: {
        activePage: activePage ?? 0,
        fakeTotalCount: 0,
        showMorePagesIndicator: false,
      },
    };
  },
};
