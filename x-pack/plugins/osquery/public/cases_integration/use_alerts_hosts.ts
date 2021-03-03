/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import deepEqual from 'fast-deep-equal';
import { useEffect, useState } from 'react';
import { useQuery } from 'react-query';

import { createFilter } from '../common/helpers';
import { useKibana } from '../common/lib/kibana';
import {
  ResultEdges,
  PageInfoPaginated,
  OsqueryQueries,
  ResultsRequestOptions,
  ResultsStrategyResponse,
  Direction,
} from '../../common/search_strategy';
import { ESTermQuery } from '../../common/typed_json';

import { generateTablePaginationOptions, getInspectResponse, InspectResponse } from './helpers';

export interface ResultsArgs {
  results: ResultEdges;
  id: string;
  inspect: InspectResponse;
  isInspected: boolean;
  pageInfo: PageInfoPaginated;
  totalCount: number;
}

interface UseAlertsHosts {
  alertIds: string[];
  alertIndices: string[];
  activePage: number;
  direction: Direction;
  limit: number;
  sortField: string;
  filterQuery?: ESTermQuery | string;
  skip?: boolean;
}

export const useAlertsHosts = ({
  alertIds,
  alertIndices,
  activePage,
  direction,
  limit,
  sortField,
  filterQuery,
  skip = false,
}: UseAlertsHosts) => {
  const { data } = useKibana().services;

  const [resultsRequest, setHostRequest] = useState<ResultsRequestOptions | null>(null);

  const response = useQuery(
    ['alertsHosts', { alertIds, alertIndices, activePage, direction, limit, sortField }],
    async () => {
      if (!resultsRequest) return Promise.resolve();

      const responseData = await data.search
        .search<ResultsRequestOptions, ResultsStrategyResponse>(resultsRequest, {
          strategy: 'osquerySearchStrategy',
        })
        .toPromise();

      return {
        ...responseData,
        alertsHosts: responseData.edges,
        inspect: getInspectResponse(responseData, {} as InspectResponse),
      };
    },
    {
      refetchInterval: 1000,
      enabled: !skip && !!resultsRequest,
    }
  );

  useEffect(() => {
    // @ts-expect-error update types
    setHostRequest((prevRequest) => {
      const myRequest = {
        ...(prevRequest ?? {}),
        alertIds,
        indices: alertIndices,
        factoryQueryType: OsqueryQueries.alertsHosts,
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
  }, [alertIds, alertIndices, activePage, direction, filterQuery, limit, sortField]);

  return response;
};
