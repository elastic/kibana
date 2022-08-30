/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useQuery } from '@tanstack/react-query';

import { i18n } from '@kbn/i18n';
import { createFilter } from '../common/helpers';
import { useKibana } from '../common/lib/kibana';
import type { ActionEdges, ActionsStrategyResponse, Direction } from '../../common/search_strategy';
import type { ESTermQuery } from '../../common/typed_json';

import { useErrorToast } from '../common/hooks/use_error_toast';

interface UseAllLiveQueries {
  activePage: number;
  direction: Direction;
  limit: number;
  sortField: string;
  filterQuery?: ESTermQuery | string;
  skip?: boolean;
}

export const useAllLiveQueries = ({
  activePage,
  direction,
  limit,
  sortField,
  filterQuery,
  skip = false,
}: UseAllLiveQueries) => {
  const { http } = useKibana().services;
  const setErrorToast = useErrorToast();

  return useQuery(
    ['actions', { activePage, direction, limit, sortField }],
    () =>
      http.get<{ data: Omit<ActionsStrategyResponse, 'edges'> & { items: ActionEdges } }>(
        '/api/osquery/live_queries',
        {
          query: {
            filterQuery: createFilter(filterQuery),
            page: activePage,
            pageSize: limit,
            sort: sortField,
            sortOrder: direction,
          },
        }
      ),
    {
      keepPreviousData: true,
      enabled: !skip,
      onSuccess: () => setErrorToast(),
      onError: (error: Error) =>
        setErrorToast(error, {
          title: i18n.translate('xpack.osquery.live_queries_all.fetchError', {
            defaultMessage: 'Error while fetching live queries',
          }),
        }),
    }
  );
};
