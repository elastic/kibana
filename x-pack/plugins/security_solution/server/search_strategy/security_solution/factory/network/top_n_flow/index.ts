/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getOr } from 'lodash/fp';

import type { IEsSearchResponse } from '@kbn/data-plugin/common';

import type { KibanaRequest } from '@kbn/core/server';
import { DEFAULT_MAX_TABLE_QUERY_SIZE } from '../../../../../../common/constants';
import type {
  NetworkTopNFlowStrategyResponse,
  NetworkQueries,
  NetworkTopNFlowEdges,
  NetworkTopNFlowCountStrategyResponse,
} from '../../../../../../common/search_strategy/security_solution/network';

import { inspectStringifyObject } from '../../../../../utils/build_query';
import type { SecuritySolutionFactory } from '../../types';

import { getTopNFlowEdges } from './helpers';
import { buildTopNFlowQuery, buildTopNFlowCountQuery } from './query.top_n_flow_network.dsl';

export const networkTopNFlow: SecuritySolutionFactory<NetworkQueries.topNFlow> = {
  buildDsl: (options, { request }) => {
    if (options.pagination && options.pagination.querySize >= DEFAULT_MAX_TABLE_QUERY_SIZE) {
      throw new Error(`No query size above ${DEFAULT_MAX_TABLE_QUERY_SIZE}`);
    }
    return buildTopNFlowQuery(options, { preference: getPreference(request) });
  },
  parse: async (
    options,
    response: IEsSearchResponse<unknown>,
    deps
  ): Promise<NetworkTopNFlowStrategyResponse> => {
    const { cursorStart, querySize } = options.pagination;
    const networkTopNFlowEdges: NetworkTopNFlowEdges[] = getTopNFlowEdges(response, options);
    const edges = networkTopNFlowEdges.splice(cursorStart, querySize - cursorStart);

    const inspect = { dsl: [inspectStringifyObject(deps?.searchRequestParams)] };
    return { ...response, inspect, edges };
  },
};

export const networkTopNFlowCount: SecuritySolutionFactory<NetworkQueries.topNFlowCount> = {
  buildDsl: (options, { request }) =>
    buildTopNFlowCountQuery(options, { preference: getPreference(request) }),
  parse: async (
    _options,
    response: IEsSearchResponse<unknown>,
    deps
  ): Promise<NetworkTopNFlowCountStrategyResponse> => {
    const totalCount = getOr(0, 'rawResponse.aggregations.top_n_flow_count.value', response);

    const inspect = { dsl: [inspectStringifyObject(deps?.searchRequestParams)] };
    return { ...response, inspect, totalCount };
  },
};

/**
 * Generates the preference parameter with the authorization header,
 * which is used as session id for the preference cache.
 * The preference parameter should never start with `_` as it is reserved for internal use.
 **/
const getPreference = (request: KibanaRequest) => {
  const authHeaderKey = request.headers.authorization;
  return `session:${Array.isArray(authHeaderKey) ? authHeaderKey.join() : authHeaderKey}`;
};
