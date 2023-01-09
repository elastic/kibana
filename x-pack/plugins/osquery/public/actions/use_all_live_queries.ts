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
import type { ActionEdges, ActionsStrategyResponse } from '../../common/search_strategy';
import type { ESTermQuery, ESExistsQuery } from '../../common/typed_json';

import { useErrorToast } from '../common/hooks/use_error_toast';
import { Direction } from '../../common/search_strategy';

export interface UseAllLiveQueriesConfig {
  activePage: number;
  direction?: Direction;
  limit: number;
  sortField: string;
  filterQuery?: ESTermQuery | ESExistsQuery | string;
  skip?: boolean;
  alertId?: string;
}

// Make sure we keep this and ACTIONS_QUERY_KEY in osquery_flyout.tsx in sync.
const ACTIONS_QUERY_KEY = 'actions';

export const useAllLiveQueries = ({
  activePage,
  direction = Direction.desc,
  limit,
  sortField,
  filterQuery,
  skip = false,
  alertId,
}: UseAllLiveQueriesConfig) => {
  const { http } = useKibana().services;
  const setErrorToast = useErrorToast();

  return useQuery(
    [
      ACTIONS_QUERY_KEY,
      { activePage, direction, limit, sortField, ...(alertId ? { alertId } : {}) },
    ],
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
