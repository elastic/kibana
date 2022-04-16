/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getOr } from 'lodash/fp';

import type { IEsSearchResponse } from '@kbn/data-plugin/common';

import { DEFAULT_MAX_TABLE_QUERY_SIZE } from '../../../../../../common/constants';
import { HostsQueries } from '../../../../../../common/search_strategy/security_solution';
import { processFieldsMap, userFieldsMap } from '../../../../../../common/ecs/ecs_fields';
import {
  HostsUncommonProcessesRequestOptions,
  HostsUncommonProcessesStrategyResponse,
} from '../../../../../../common/search_strategy/security_solution/hosts/uncommon_processes';

import { inspectStringifyObject } from '../../../../../utils/build_query';

import { SecuritySolutionFactory } from '../../types';
import { buildQuery } from './dsl/query.dsl';
import { formatUncommonProcessesData, getHits, uncommonProcessesFields } from './helpers';

export const uncommonProcesses: SecuritySolutionFactory<HostsQueries.uncommonProcesses> = {
  buildDsl: (options: HostsUncommonProcessesRequestOptions) => {
    if (options.pagination && options.pagination.querySize >= DEFAULT_MAX_TABLE_QUERY_SIZE) {
      throw new Error(`No query size above ${DEFAULT_MAX_TABLE_QUERY_SIZE}`);
    }
    return buildQuery(options);
  },
  parse: async (
    options: HostsUncommonProcessesRequestOptions,
    response: IEsSearchResponse<unknown>
  ): Promise<HostsUncommonProcessesStrategyResponse> => {
    const { activePage, cursorStart, fakePossibleCount, querySize } = options.pagination;
    const totalCount = getOr(0, 'aggregations.process_count.value', response.rawResponse);
    const buckets = getOr([], 'aggregations.group_by_process.buckets', response.rawResponse);
    const hits = getHits(buckets);

    const uncommonProcessesEdges = hits.map((hit) =>
      formatUncommonProcessesData(uncommonProcessesFields, hit, {
        ...processFieldsMap,
        ...userFieldsMap,
      })
    );

    const fakeTotalCount = fakePossibleCount <= totalCount ? fakePossibleCount : totalCount;
    const edges = uncommonProcessesEdges.splice(cursorStart, querySize - cursorStart);
    const inspect = {
      dsl: [inspectStringifyObject(buildQuery(options))],
      response: [inspectStringifyObject(response)],
    };

    const showMorePagesIndicator = totalCount > fakeTotalCount;
    return {
      ...response,
      edges,
      inspect,
      pageInfo: {
        activePage: activePage ?? 0,
        fakeTotalCount,
        showMorePagesIndicator,
      },
      totalCount,
    };
  },
};
