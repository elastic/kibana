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

import { useErrorToast } from '../common/hooks/use_error_toast';
import { Direction } from '../../common/search_strategy';
import type { ESTermQuery, ESExistsQuery, ESMatchPhraseQuery } from '../../common/typed_json';

export interface UseAllLiveQueriesConfig {
  activePage: number;
  direction?: Direction;
  limit: number;
  sortField: string;
  skip?: boolean;
  actionId?: string;
  alertId?: string;
}

// Make sure we keep this and ACTIONS_QUERY_KEY in osquery_flyout.tsx in sync.
const ACTIONS_QUERY_KEY = 'actions';

const getFilterQuery = (
  alertId?: string,
  actionId?: string
): ESTermQuery | ESExistsQuery | ESMatchPhraseQuery => {
  if (alertId) {
    return { term: { alert_ids: alertId } };
  }

  if (actionId) {
    return {
      match_phrase: {
        action_id: actionId,
      },
    };
  }

  return {
    exists: {
      field: 'user_id',
    },
  };
};

export const useAllLiveQueries = ({
  activePage,
  direction = Direction.desc,
  limit,
  sortField,

  skip = false,
  actionId,
  alertId,
}: UseAllLiveQueriesConfig) => {
  const { http } = useKibana().services;
  const setErrorToast = useErrorToast();
  const filterQuery = getFilterQuery(alertId, actionId);

  return useQuery(
    [ACTIONS_QUERY_KEY, { activePage, direction, limit, sortField, actionId, alertId }],
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
