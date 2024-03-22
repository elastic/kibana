/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getOr } from 'lodash/fp';

import { DEFAULT_MAX_TABLE_QUERY_SIZE } from '../../../../../../common/constants';
import type {
  NetworkTopNFlowStrategyResponse,
  NetworkQueries,
  NetworkTopNFlowEdges,
} from '../../../../../../common/search_strategy/security_solution/network';

import { inspectStringifyObject } from '../../../../../utils/build_query';
import type { SecuritySolutionFactory } from '../../types';

import { getTopNFlowEdges } from './helpers';
import {
  buildTopNFlowQuery,
  buildTopNFlowCountQuery,
  buildTopNFlowFullQuery,
} from './query.top_n_flow_network.dsl';

export const networkTopNFlow: SecuritySolutionFactory<NetworkQueries.topNFlow> = {
  buildDsl: (options) => {
    if (options.pagination && options.pagination.querySize >= DEFAULT_MAX_TABLE_QUERY_SIZE) {
      throw new Error(`No query size above ${DEFAULT_MAX_TABLE_QUERY_SIZE}`);
    }
    return buildTopNFlowQuery(options);
  },
  buildCountDsl: (options) => buildTopNFlowCountQuery(options),
  parseResponses: async (
    options,
    [searchResponse, countResponse],
    { dsls }
  ): Promise<NetworkTopNFlowStrategyResponse> => {
    const { cursorStart, querySize } = options.pagination;
    const networkTopNFlowEdges: NetworkTopNFlowEdges[] = getTopNFlowEdges(searchResponse, options);
    const edges = networkTopNFlowEdges.splice(cursorStart, querySize - cursorStart);
    const totalCount = getOr(0, 'rawResponse.aggregations.top_n_flow_count.value', countResponse);

    return {
      ...searchResponse,
      edges,
      totalCount,
      inspect: {
        dsl: dsls.map((dsl) => inspectStringifyObject(dsl)),
        response: [searchResponse.rawResponse, countResponse.rawResponse].map((rawResponse) =>
          inspectStringifyObject(rawResponse)
        ),
      },
    };
  },
};

export const networkTopNFlowCount: SecuritySolutionFactory<NetworkQueries.topNFlowCount> = {
  buildDsl: (options) => {
    if (options.pagination && options.pagination.querySize >= DEFAULT_MAX_TABLE_QUERY_SIZE) {
      throw new Error(`No query size above ${DEFAULT_MAX_TABLE_QUERY_SIZE}`);
    }
    return buildTopNFlowFullQuery(options);
  },
  parse: async (options, response, { dsl }): Promise<NetworkTopNFlowStrategyResponse> => {
    const { cursorStart, querySize } = options.pagination;
    const networkTopNFlowEdges: NetworkTopNFlowEdges[] = getTopNFlowEdges(response, options);
    const edges = networkTopNFlowEdges.splice(cursorStart, querySize - cursorStart);
    const totalCount = getOr(0, 'rawResponse.aggregations.top_n_flow_count.value', response);

    return {
      ...response,
      edges,
      totalCount,
      inspect: {
        dsl: [inspectStringifyObject(dsl)],
        response: [inspectStringifyObject(response.rawResponse)],
      },
    };
  },
};
