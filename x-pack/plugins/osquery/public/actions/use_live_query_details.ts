/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useQuery } from '@tanstack/react-query';

import { i18n } from '@kbn/i18n';
import { filter } from 'lodash';
import type { ECSMapping } from '@kbn/osquery-io-ts-types';
import { useKibana } from '../common/lib/kibana';
import type { ESTermQuery } from '../../common/typed_json';
import { useErrorToast } from '../common/hooks/use_error_toast';

interface UseLiveQueryDetails {
  actionId?: string;
  isLive?: boolean;
  filterQuery?: ESTermQuery | string;
  skip?: boolean;
  queryIds?: string[];
}

export interface PackQueriesQuery {
  action_id: string;
  id: string;
  query: string;
  agents: string[];
  ecs_mapping?: ECSMapping;
  version?: string;
  platform?: string;
  saved_query_id?: string;
  expiration?: string;
}

export interface LiveQueryDetailsItem {
  action_id: string;
  expiration: string;
  '@timestamp': string;
  agent_all: boolean;
  agent_ids: string[];
  agent_platforoms: string[];
  agent_policy_ids: string[];
  agents: string[];
  user_id?: string;
  pack_id?: string;
  pack_name?: string;
  pack_prebuilt?: boolean;
  status?: string;
  queries?: PackQueriesQuery[];
}

export const useLiveQueryDetails = ({
  actionId,
  filterQuery,
  isLive = false,
  skip = false,
  queryIds, // enable finding out specific queries only, eg. in cases
}: UseLiveQueryDetails) => {
  const { http } = useKibana().services;
  const setErrorToast = useErrorToast();

  return useQuery<{ data: LiveQueryDetailsItem }, Error, LiveQueryDetailsItem>(
    ['liveQueries', { actionId, filterQuery, queryIds }],
    () => http.get(`/api/osquery/live_queries/${actionId}`),
    {
      enabled: !skip && !!actionId,
      refetchInterval: isLive ? 5000 : false,
      onSuccess: () => setErrorToast(),
      onError: (error) =>
        setErrorToast(error, {
          title: i18n.translate('xpack.osquery.action_details.fetchError', {
            defaultMessage: 'Error while fetching action details',
          }),
        }),
      select: (response) => {
        if (queryIds) {
          const filteredQueries = filter(response.data.queries, (query) =>
            queryIds.includes(query.action_id)
          );

          return { ...response.data, queries: filteredQueries };
        }

        return response.data;
      },
      refetchOnWindowFocus: false,
      retryDelay: 5000,
    }
  );
};
