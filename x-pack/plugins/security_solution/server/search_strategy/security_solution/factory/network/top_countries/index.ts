/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getOr } from 'lodash/fp';

import type { IEsSearchResponse } from '../../../../../../../../../src/plugins/data/common';

import { DEFAULT_MAX_TABLE_QUERY_SIZE } from '../../../../../../common/constants';
import {
  NetworkTopCountriesStrategyResponse,
  NetworkQueries,
  NetworkTopCountriesRequestOptions,
  NetworkTopCountriesEdges,
} from '../../../../../../common/search_strategy/security_solution/network';

import { inspectStringifyObject } from '../../../../../utils/build_query';
import { SecuritySolutionFactory } from '../../types';

import { getTopCountriesEdges } from './helpers';
import { buildTopCountriesQuery } from './query.top_countries_network.dsl';
import { buildTopCountriesQueryEntities } from './query.top_countries_network_entities.dsl';

export const networkTopCountries: SecuritySolutionFactory<NetworkQueries.topCountries> = {
  buildDsl: (options: NetworkTopCountriesRequestOptions) => {
    if (options.pagination && options.pagination.querySize >= DEFAULT_MAX_TABLE_QUERY_SIZE) {
      throw new Error(`No query size above ${DEFAULT_MAX_TABLE_QUERY_SIZE}`);
    }
    return buildTopCountriesQuery(options);
  },
  parse: async (
    options: NetworkTopCountriesRequestOptions,
    response: IEsSearchResponse<unknown>
  ): Promise<NetworkTopCountriesStrategyResponse> => {
    const { activePage, cursorStart, fakePossibleCount, querySize } = options.pagination;
    const totalCount = getOr(0, 'aggregations.top_countries_count.value', response.rawResponse);
    const networkTopCountriesEdges: NetworkTopCountriesEdges[] = getTopCountriesEdges(
      response,
      options
    );
    const fakeTotalCount = fakePossibleCount <= totalCount ? fakePossibleCount : totalCount;
    const edges = networkTopCountriesEdges.splice(cursorStart, querySize - cursorStart);
    const inspect = {
      dsl: [inspectStringifyObject(buildTopCountriesQuery(options))],
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

export const networkTopCountriesEntities: SecuritySolutionFactory<NetworkQueries.topCountries> = {
  buildDsl: (options: NetworkTopCountriesRequestOptions) => {
    if (options.pagination && options.pagination.querySize >= DEFAULT_MAX_TABLE_QUERY_SIZE) {
      throw new Error(`No query size above ${DEFAULT_MAX_TABLE_QUERY_SIZE}`);
    }
    return buildTopCountriesQueryEntities(options);
  },
  parse: async (
    options: NetworkTopCountriesRequestOptions,
    response: IEsSearchResponse<unknown>
  ): Promise<NetworkTopCountriesStrategyResponse> => {
    const { activePage, cursorStart, fakePossibleCount, querySize } = options.pagination;
    const totalCount = getOr(0, 'aggregations.top_countries_count.value', response.rawResponse);
    const networkTopCountriesEdges: NetworkTopCountriesEdges[] = getTopCountriesEdges(
      response,
      options
    );
    const fakeTotalCount = fakePossibleCount <= totalCount ? fakePossibleCount : totalCount;
    const edges = networkTopCountriesEdges.splice(cursorStart, querySize - cursorStart);
    const inspect = {
      dsl: [inspectStringifyObject(buildTopCountriesQueryEntities(options))],
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
