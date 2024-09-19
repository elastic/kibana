/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getOr } from 'lodash/fp';
import { SecuritySolutionFactory } from '../../types';
import {
  HostTacticsEdges,
  HostTacticsRequestOptions,
  HostTacticsStrategyResponse,
  UebaQueries,
} from '../../../../../../common';
import { DEFAULT_MAX_TABLE_QUERY_SIZE } from '../../../../../../common/constants';
import { buildHostTacticsQuery } from './query.host_tactics.dsl';
import { IEsSearchResponse } from '../../../../../../../../../src/plugins/data/common';
import { formatHostTacticsData } from './helpers';
import { inspectStringifyObject } from '../../../../../utils/build_query';

export const hostTactics: SecuritySolutionFactory<UebaQueries.hostTactics> = {
  buildDsl: (options: HostTacticsRequestOptions) => {
    if (options.pagination && options.pagination.querySize >= DEFAULT_MAX_TABLE_QUERY_SIZE) {
      throw new Error(`No query size above ${DEFAULT_MAX_TABLE_QUERY_SIZE}`);
    }

    return buildHostTacticsQuery(options);
  },
  parse: async (
    options: HostTacticsRequestOptions,
    response: IEsSearchResponse<unknown>
  ): Promise<HostTacticsStrategyResponse> => {
    const { activePage, cursorStart, fakePossibleCount, querySize } = options.pagination;
    const totalCount = getOr(0, 'aggregations.tactic_count.value', response.rawResponse);
    const techniqueCount = getOr(0, 'aggregations.technique_count.value', response.rawResponse);
    const fakeTotalCount = fakePossibleCount <= totalCount ? fakePossibleCount : totalCount;
    const hostTacticsEdges: HostTacticsEdges[] = formatHostTacticsData(
      getOr([], 'aggregations.tactic.buckets', response.rawResponse)
    );
    const edges = hostTacticsEdges.splice(cursorStart, querySize - cursorStart);
    const inspect = {
      dsl: [inspectStringifyObject(buildHostTacticsQuery(options))],
    };
    const showMorePagesIndicator = totalCount > fakeTotalCount;
    return {
      ...response,
      inspect,
      edges,
      techniqueCount,
      totalCount,
      pageInfo: {
        activePage: activePage ?? 0,
        fakeTotalCount,
        showMorePagesIndicator,
      },
    };
  },
};
