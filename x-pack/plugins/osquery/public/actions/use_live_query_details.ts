/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useQuery } from '@tanstack/react-query';

import { i18n } from '@kbn/i18n';
import { useKibana } from '../common/lib/kibana';
import type { ESTermQuery } from '../../common/typed_json';
import { useErrorToast } from '../common/hooks/use_error_toast';

export interface LiveQueryDetailsArgs {
  actionDetails: Record<string, string>;
  id: string;
}

interface UseLiveQueryDetails {
  actionId?: string;
  isLive?: boolean;
  filterQuery?: ESTermQuery | string;
  skip?: boolean;
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
  queries?: Array<{
    action_id: string;
    id: string;
    query: string;
    agents: string[];
    ecs_mapping?: unknown;
    version?: string;
    platform?: string;
    saved_query_id?: string;
    expiration?: string;
  }>;
}

export const useLiveQueryDetails = ({
  actionId,
  filterQuery,
  isLive = false,
  skip = false,
}: UseLiveQueryDetails) => {
  const { http } = useKibana().services;
  const setErrorToast = useErrorToast();

  return useQuery<{ data: LiveQueryDetailsItem }, Error, LiveQueryDetailsItem>(
    ['liveQueries', { actionId, filterQuery }],
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
      select: (response) => response.data,
      refetchOnWindowFocus: false,
      retryDelay: 5000,
    }
  );
};
