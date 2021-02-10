/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEffect, useState } from 'react';
import { useQuery } from 'react-query';
import deepEqual from 'fast-deep-equal';

import { createFilter } from '../common/helpers';
import { useKibana } from '../common/lib/kibana';
import {
  ActionEdges,
  PageInfoPaginated,
  OsqueryQueries,
  ActionsRequestOptions,
  ActionsStrategyResponse,
  Direction,
} from '../../common/search_strategy';
import { ESTermQuery } from '../../common/typed_json';

import { generateTablePaginationOptions, getInspectResponse, InspectResponse } from './helpers';

export interface ActionsArgs {
  actions: ActionEdges;
  id: string;
  inspect: InspectResponse;
  isInspected: boolean;
  pageInfo: PageInfoPaginated;
  totalCount: number;
}

interface UseAllActions {
  activePage: number;
  direction: Direction;
  limit: number;
  sortField: string;
  filterQuery?: ESTermQuery | string;
  skip?: boolean;
}

export const useAllActions = ({
  activePage,
  direction,
  limit,
  sortField,
  filterQuery,
  skip = false,
}: UseAllActions) => {
  const { data } = useKibana().services;

  const [actionsRequest, setHostRequest] = useState<ActionsRequestOptions | null>(null);

  const response = useQuery(
    ['actions', { activePage, direction, limit, sortField }],
    async () => {
      if (!actionsRequest) return Promise.resolve();

      const responseData = await data.search
        .search<ActionsRequestOptions, ActionsStrategyResponse>(actionsRequest, {
          strategy: 'osquerySearchStrategy',
        })
        .toPromise();

      return {
        ...responseData,
        actions: responseData.edges,
        inspect: getInspectResponse(responseData, {} as InspectResponse),
      };
    },
    {
      enabled: !skip && !!actionsRequest,
    }
  );

  useEffect(() => {
    setHostRequest((prevRequest) => {
      const myRequest = {
        ...(prevRequest ?? {}),
        factoryQueryType: OsqueryQueries.actions,
        filterQuery: createFilter(filterQuery),
        pagination: generateTablePaginationOptions(activePage, limit),
        sort: {
          direction,
          field: sortField,
        },
      };
      if (!deepEqual(prevRequest, myRequest)) {
        return myRequest;
      }
      return prevRequest;
    });
  }, [activePage, direction, filterQuery, limit, sortField]);

  return response;
};
