/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useQuery } from 'react-query';

import { createFilter } from '../common/helpers';
import { useKibana } from '../common/lib/kibana';
import {
  PageInfoPaginated,
  OsqueryQueries,
  AgentsRequestOptions,
  AgentsStrategyResponse,
  Direction,
} from '../../common/search_strategy';
import { ESTermQuery } from '../../common/typed_json';
import { Agent } from '../../common/shared_imports';

import { generateTablePaginationOptions, getInspectResponse, InspectResponse } from './helpers';

export interface AgentsArgs {
  agents: Agent[];
  id: string;
  inspect: InspectResponse;
  isInspected: boolean;
  pageInfo: PageInfoPaginated;
  totalCount: number;
}

interface UseAllAgents {
  activePage: number;
  direction: Direction;
  limit: number;
  sortField: string;
  filterQuery?: ESTermQuery | string;
  skip?: boolean;
}

export const useAllAgents = ({
  activePage,
  direction,
  limit,
  sortField,
  filterQuery,
  skip = false,
}: UseAllAgents) => {
  const { data } = useKibana().services;

  return useQuery(
    ['agents', { activePage, direction, limit, sortField }],
    async () => {
      const responseData = await data.search
        .search<AgentsRequestOptions, AgentsStrategyResponse>(
          {
            factoryQueryType: OsqueryQueries.agents,
            filterQuery: createFilter(filterQuery),
            pagination: generateTablePaginationOptions(activePage, limit),
            sort: {
              direction,
              field: sortField,
            },
          },
          {
            strategy: 'osquerySearchStrategy',
          }
        )
        .toPromise();

      return {
        ...responseData,
        agents: responseData.edges,
        inspect: getInspectResponse(responseData),
      };
    },
    {
      enabled: !skip,
    }
  );
};
