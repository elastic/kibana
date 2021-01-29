/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { useEffect, useState, useRef } from 'react';
import { useKibana } from '../common/lib/kibana';
import { AbortError } from '../../../../../src/plugins/kibana_utils/common';

import {
  OsqueryQueries,
  AgentsRequestOptions,
  AgentsStrategyResponse,
} from '../../common/search_strategy';

import { isCompleteResponse, isErrorResponse } from '../../../../../src/plugins/data/common';
import { generateTablePaginationOptions } from './helpers';
import * as i18n from './translations';

export const ALL_AGENTS_GROUP_KEY = 'All agents';
export const useAgentGroups = () => {
  const { data, notifications } = useKibana().services;
  const [loading, setLoading] = useState(true);
  const [platforms, setPlatforms] = useState<string[]>([]);
  const [policies, setPolicies] = useState<string[]>([]);

  const abortCtrl = useRef(new AbortController());
  useEffect(() => {
    let didCancel = false;
    const searchSubscription$ = data.search
      .search<AgentsRequestOptions, AgentsStrategyResponse>(
        {
          filterQuery: undefined,
          factoryQueryType: OsqueryQueries.agents,
          aggregations: {
            platforms: 'local_metadata.os.platform',
            policies: 'policy_id',
          },
          pagination: generateTablePaginationOptions(0, 9000),
          sort: {
            direction: 'asc',
            field: 'local_metadata.os.platform',
          },
        } as AgentsRequestOptions,
        {
          strategy: 'osquerySearchStrategy',
          abortSignal: abortCtrl.current.signal,
        }
      )
      .subscribe({
        next: (response) => {
          if (isCompleteResponse(response)) {
            if (!didCancel) {
              setLoading(false);
              if (response.aggregations) {
                const aggs = response.aggregations;
                setPlatforms(aggs.platforms.buckets.map((o) => o.key));
                setPolicies(aggs.policies.buckets.map((o) => o.key));
              }
            }
            searchSubscription$.unsubscribe();
          } else if (isErrorResponse(response)) {
            if (!didCancel) {
              setLoading(false);
            }
            // TODO: Make response error status clearer
            notifications.toasts.addWarning(i18n.ERROR_AGENT_GROUPS);
            searchSubscription$.unsubscribe();
          }
        },
        error: (msg) => {
          if (!(msg instanceof AbortError)) {
            notifications.toasts.addDanger({ title: i18n.FAIL_AGENT_GROUPS, text: msg.message });
          }
        },
      });
    const abort = abortCtrl.current;
    return () => {
      didCancel = true;
      abort.abort();
    };
  }, [setPolicies, setPlatforms, data.search, notifications.toasts]);
  return {
    loading,
    groups: {
      [ALL_AGENTS_GROUP_KEY]: [],
      platforms,
      policies,
    },
  };
};
