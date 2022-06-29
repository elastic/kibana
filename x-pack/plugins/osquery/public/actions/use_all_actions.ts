/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useInfiniteQuery, useQuery } from 'react-query';

import { i18n } from '@kbn/i18n';
import { lastValueFrom } from 'rxjs';
import { useState } from 'react';
import {
  createFilter,
  generateTablePaginationOptions,
  getInspectResponse,
  InspectResponse,
} from '../common/helpers';
import { useKibana } from '../common/lib/kibana';
import {
  OsqueryQueries,
  ActionsRequestOptions,
  ActionsStrategyResponse,
  Direction,
} from '../../common/search_strategy';
import { ESTermQuery } from '../../common/typed_json';

import { useErrorToast } from '../common/hooks/use_error_toast';

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
  const setErrorToast = useErrorToast();

  return useQuery(
    ['actions', { activePage, direction, limit, sortField }],
    async () => {
      const responseData = await lastValueFrom(
        data.search.search<ActionsRequestOptions, ActionsStrategyResponse>(
          {
            factoryQueryType: OsqueryQueries.actions,
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
      );

      return {
        ...responseData,
        actions: responseData.edges,
        inspect: getInspectResponse(responseData, {} as InspectResponse),
      };
    },
    {
      keepPreviousData: true,
      enabled: !skip,
      onSuccess: () => setErrorToast(),
      onError: (error: Error) =>
        setErrorToast(error, {
          title: i18n.translate('xpack.osquery.all_actions.fetchError', {
            defaultMessage: 'Error while fetching actions',
          }),
        }),
    }
  );
};

export const useInfiniteAllActions = ({
  activePage,
  direction,
  limit,
  sortField,
  eventDetailId,
  filterQuery,
}: UseAllActions & { eventDetailId: string }) => {
  const { data } = useKibana().services;
  const setErrorToast = useErrorToast();
  const [nextPage, setNextPage] = useState(0);

  return useInfiniteQuery(
    ['actions', { activePage, direction, limit, sortField, eventDetailId }],
    async ({ pageParam = activePage }) => {
      setNextPage(pageParam + 1);
      const responseData = await lastValueFrom(
        data.search.search<ActionsRequestOptions, ActionsStrategyResponse>(
          {
            factoryQueryType: OsqueryQueries.actions,
            filterQuery: createFilter(filterQuery),
            pagination: generateTablePaginationOptions(pageParam, limit),
            sort: {
              direction,
              field: sortField,
            },
          },
          {
            strategy: 'osquerySearchStrategy',
          }
        )
      );

      return {
        ...responseData,
        actions: responseData.edges,
        inspect: getInspectResponse(responseData, {} as InspectResponse),
      };
    },
    {
      getNextPageParam: (lastPage) =>
        limit * nextPage < lastPage.totalCount ? nextPage : undefined,
      keepPreviousData: true,
      onSuccess: () => setErrorToast(),
      onError: (error: Error) =>
        setErrorToast(error, {
          title: i18n.translate('xpack.osquery.all_actions.fetchError', {
            defaultMessage: 'Error while fetching actions',
          }),
        }),
    }
  );
};
