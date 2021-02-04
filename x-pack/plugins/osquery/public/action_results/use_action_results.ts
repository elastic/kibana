/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import deepEqual from 'fast-deep-equal';
import { useCallback, useEffect, useState } from 'react';
import { useQuery } from 'react-query';

import { createFilter } from '../common/helpers';
import { useKibana } from '../common/lib/kibana';
import {
  ResultEdges,
  PageInfoPaginated,
  DocValueFields,
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

interface UseActionResults {
  actionId: string;
  activePage: number;
  direction: Direction;
  limit: number;
  sortField: string;
  docValueFields?: DocValueFields[];
  filterQuery?: ESTermQuery | string;
  skip?: boolean;
}

export const useActionResults = ({
  actionId,
  activePage,
  direction,
  limit,
  sortField,
  docValueFields,
  filterQuery,
  skip = false,
}: UseActionResults) => {
  const { data } = useKibana().services;

  const [resultsRequest, setHostRequest] = useState<ResultsRequestOptions | null>(null);

  const response = useQuery(
    ['actionResults', { actionId, activePage, direction, limit, sortField }],
    async () => {
      if (!resultsRequest) return Promise.resolve();

      const responseData = await data.search
        .search<ResultsRequestOptions, ResultsStrategyResponse>(resultsRequest!, {
          strategy: 'osquerySearchStrategy',
        })
        .toPromise();

      return {
        ...responseData,
        results: responseData.edges,
        inspect: getInspectResponse(responseData, {}),
      };
    },
    {
      enabled: !skip && !!resultsRequest,
    }
  );

  useEffect(() => {
    setHostRequest((prevRequest) => {
      const myRequest = {
        ...(prevRequest ?? {}),
        actionId,
        docValueFields: docValueFields ?? [],
        factoryQueryType: OsqueryQueries.actionResults,
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
  }, [actionId, activePage, direction, docValueFields, filterQuery, limit, sortField]);

  return response;
};
