/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

// import { getOr } from 'lodash/fp';

import { IEsSearchResponse } from '../../../../../../../../../src/plugins/data/common';
import { DEFAULT_MAX_TABLE_QUERY_SIZE } from '../../../../../../common/constants';
import {
  ActionsStrategyResponse,
  ActionsRequestOptions,
  OsqueryQueries,
} from '../../../../../../common/search_strategy/osquery';

import { inspectStringifyObject } from '../../../../../../common/utils/build_query';
import { OsqueryFactory } from '../../types';
import { buildActionsQuery } from './query.all_actions.dsl';

export const allActions: OsqueryFactory<OsqueryQueries.actions> = {
  buildDsl: (options: ActionsRequestOptions) => {
    if (options.pagination && options.pagination.querySize >= DEFAULT_MAX_TABLE_QUERY_SIZE) {
      throw new Error(`No query size above ${DEFAULT_MAX_TABLE_QUERY_SIZE}`);
    }
    return buildActionsQuery(options);
  },
  parse: async (
    options: ActionsRequestOptions,
    response: IEsSearchResponse<unknown>
  ): Promise<ActionsStrategyResponse> => {
    const { activePage, cursorStart, fakePossibleCount, querySize } = options.pagination;
    // const totalCount = getOr(0, 'aggregations.host_count.value', response.rawResponse);
    // const buckets: any[] = getOr([], 'aggregations.host_data.buckets', response.rawResponse);
    // const hostsEdges = buckets.map((bucket) => formatHostEdgesData(HOSTS_FIELDS, bucket));
    // const fakeTotalCount = fakePossibleCount <= totalCount ? fakePossibleCount : totalCount;
    // const edges = hostsEdges.splice(cursorStart, querySize - cursorStart);
    const inspect = {
      dsl: [inspectStringifyObject(buildActionsQuery(options))],
    };

    // console.log(JSON.stringify(response, null, 2));

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
