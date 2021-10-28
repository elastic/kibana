/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getOr } from 'lodash/fp';
import { SecuritySolutionFactory } from '../../types';
import {
  HostRulesEdges,
  HostRulesRequestOptions,
  HostRulesStrategyResponse,
  UebaQueries,
} from '../../../../../../common';
import { DEFAULT_MAX_TABLE_QUERY_SIZE } from '../../../../../../common/constants';
import { buildHostRulesQuery } from './query.host_rules.dsl';
import { IEsSearchResponse } from '../../../../../../../../../src/plugins/data/common';
import { formatHostRulesData } from './helpers';
import { inspectStringifyObject } from '../../../../../utils/build_query';

export const hostRules: SecuritySolutionFactory<UebaQueries.hostRules> = {
  buildDsl: (options: HostRulesRequestOptions) => {
    if (options.pagination && options.pagination.querySize >= DEFAULT_MAX_TABLE_QUERY_SIZE) {
      throw new Error(`No query size above ${DEFAULT_MAX_TABLE_QUERY_SIZE}`);
    }

    return buildHostRulesQuery(options);
  },
  parse: async (
    options: HostRulesRequestOptions,
    response: IEsSearchResponse<unknown>
  ): Promise<HostRulesStrategyResponse> => {
    const { activePage, cursorStart, fakePossibleCount, querySize } = options.pagination;
    const totalCount = getOr(0, 'aggregations.rule_count.value', response.rawResponse);
    const fakeTotalCount = fakePossibleCount <= totalCount ? fakePossibleCount : totalCount;

    const hostRulesEdges: HostRulesEdges[] = formatHostRulesData(
      getOr([], 'aggregations.rule_name.buckets', response.rawResponse)
    );

    const edges = hostRulesEdges.splice(cursorStart, querySize - cursorStart);
    const inspect = {
      dsl: [inspectStringifyObject(buildHostRulesQuery(options))],
    };
    const showMorePagesIndicator = totalCount > fakeTotalCount;
    return {
      ...response,
      inspect,
      edges,
      totalCount,
      pageInfo: {
        activePage: activePage ?? 0,
        fakeTotalCount,
        showMorePagesIndicator,
      },
    };
  },
};
