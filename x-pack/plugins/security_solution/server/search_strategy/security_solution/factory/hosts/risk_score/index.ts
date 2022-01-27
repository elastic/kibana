/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getOr } from 'lodash/fp';
import { SecuritySolutionFactory } from '../../types';
import {
  HostsRiskScoreRequestOptions,
  HostsQueries,
  HostsRiskScoreStrategyResponse,
  HostRiskScoreBuckets,
} from '../../../../../../common/search_strategy';
import type { IEsSearchResponse } from '../../../../../../../../../src/plugins/data/common';
import { inspectStringifyObject } from '../../../../../utils/build_query';
import { buildHostsRiskScoreQuery } from './query.hosts_risk.dsl';
import { DEFAULT_MAX_TABLE_QUERY_SIZE } from '../../../../../../common/constants';
import { getTotalCount } from '../../cti/event_enrichment/helpers';
import { formatHostRisksEdges } from './helpers';

export const riskScore: SecuritySolutionFactory<HostsQueries.hostsRiskScore> = {
  buildDsl: (options: HostsRiskScoreRequestOptions) => {
    if (options.pagination && options.pagination.querySize >= DEFAULT_MAX_TABLE_QUERY_SIZE) {
      throw new Error(`No query size above ${DEFAULT_MAX_TABLE_QUERY_SIZE}`);
    }

    return buildHostsRiskScoreQuery(options);
  },
  parse: async (
    options: HostsRiskScoreRequestOptions,
    response: IEsSearchResponse<unknown>
  ): Promise<HostsRiskScoreStrategyResponse> => {
    const inspect = {
      dsl: [inspectStringifyObject(buildHostsRiskScoreQuery(options))],
    };

    const totalCount = getTotalCount(response.rawResponse.hits.total);

    return {
      inspect,
      totalCount,
      ...(options.onlyLatest ? formatAggs(options, response) : response),
    };
  },
};

const formatAggs = (
  options: HostsRiskScoreRequestOptions,
  response: IEsSearchResponse<unknown>
) => {
  const { activePage, cursorStart, fakePossibleCount, querySize } = options.pagination;
  console.log('options.pagination~~~', options.pagination);
  const totalCount = getOr(0, 'aggregations.host_count.value', response.rawResponse);
  const buckets: HostRiskScoreBuckets[] = getOr(
    [],
    'aggregations.hosts.buckets',
    response.rawResponse
  );

  const hostsEdges = formatHostRisksEdges(buckets);
  const fakeTotalCount = fakePossibleCount <= totalCount ? fakePossibleCount : totalCount;
  const showMorePagesIndicator = totalCount > fakeTotalCount;
  const edges = hostsEdges.splice(cursorStart, querySize - cursorStart);
  return {
    ...response,
    edges,
    totalCount,
    pageInfo: {
      activePage: activePage ?? 0,
      fakeTotalCount,
      showMorePagesIndicator,
    },
  };
};
