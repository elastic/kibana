/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { useState } from 'react';
import { useQuery } from 'react-query';
import { i18n } from '@kbn/i18n';
import { firstValueFrom } from 'rxjs';
import { useKibana } from '../common/lib/kibana';
import { useAgentPolicies } from './use_agent_policies';

import {
  OsqueryQueries,
  AgentsRequestOptions,
  AgentsStrategyResponse,
} from '../../common/search_strategy';

import { processAggregations } from './helpers';
import { generateTablePaginationOptions } from '../common/helpers';
import { Overlap, Group } from './types';
import { useErrorToast } from '../common/hooks/use_error_toast';

interface UseAgentGroups {
  osqueryPolicies: string[];
  osqueryPoliciesLoading: boolean;
}

export const useAgentGroups = ({ osqueryPolicies, osqueryPoliciesLoading }: UseAgentGroups) => {
  const { data } = useKibana().services;
  const setErrorToast = useErrorToast();

  const { agentPoliciesLoading, agentPolicyById } = useAgentPolicies(osqueryPolicies);
  const [platforms, setPlatforms] = useState<Group[]>([]);
  const [policies, setPolicies] = useState<Group[]>([]);
  const [loading, setLoading] = useState(true);
  const [overlap, setOverlap] = useState<Overlap>(() => ({}));
  const [totalCount, setTotalCount] = useState<number>(0);
  const { isFetched } = useQuery(
    ['agentGroups'],
    async () => {
      const responseData = await firstValueFrom(
        data.search.search<AgentsRequestOptions, AgentsStrategyResponse>(
          {
            filterQuery: { terms: { policy_id: osqueryPolicies } },
            factoryQueryType: OsqueryQueries.agents,
            aggregations: {
              platforms: {
                terms: {
                  field: 'local_metadata.os.platform',
                },
                aggs: {
                  policies: {
                    terms: {
                      field: 'policy_id',
                    },
                  },
                },
              },
              policies: {
                terms: {
                  field: 'policy_id',
                },
              },
            },
            pagination: generateTablePaginationOptions(0, 9000),
            sort: {
              direction: 'asc',
              field: 'local_metadata.os.platform',
            },
          } as AgentsRequestOptions,
          {
            strategy: 'osquerySearchStrategy',
          }
        )
      );

      if (responseData.rawResponse.aggregations) {
        const {
          platforms: newPlatforms,
          overlap: newOverlap,
          policies: newPolicies,
        } = processAggregations(responseData.rawResponse.aggregations);

        setPlatforms(newPlatforms);
        setOverlap(newOverlap);
        setPolicies(
          newPolicies.map((p) => {
            const name = agentPolicyById[p.id]?.name ?? p.name;
            return {
              ...p,
              name,
            };
          })
        );
      }

      setLoading(false);
      setTotalCount(responseData.totalCount);
    },
    {
      enabled: !osqueryPoliciesLoading && !agentPoliciesLoading,
      onSuccess: () => setErrorToast(),
      onError: (error) =>
        setErrorToast(error as Error, {
          title: i18n.translate('xpack.osquery.agent_groups.fetchError', {
            defaultMessage: 'Error while fetching agent groups',
          }),
        }),
    }
  );

  return {
    isFetched,
    loading,
    totalCount,
    groups: {
      platforms,
      policies,
      overlap,
    },
  };
};
