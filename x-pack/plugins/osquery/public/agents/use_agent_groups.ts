/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { useQuery } from '@tanstack/react-query';
import { i18n } from '@kbn/i18n';
import { lastValueFrom } from 'rxjs';
import { useKibana } from '../common/lib/kibana';
import { useAgentPolicies } from './use_agent_policies';

import type { AgentsRequestOptions, AgentsStrategyResponse } from '../../common/search_strategy';
import { OsqueryQueries } from '../../common/search_strategy';

import { processAggregations } from './helpers';
import { generateTablePaginationOptions } from '../common/helpers';
import { useErrorToast } from '../common/hooks/use_error_toast';
import { useOsqueryPolicies } from './use_osquery_policies';

export const useAgentGroups = () => {
  const { data } = useKibana().services;
  const setErrorToast = useErrorToast();

  const { data: osqueryPolicies, isFetched: isOsqueryPoliciesFetched } = useOsqueryPolicies();
  const { agentPoliciesLoading, agentPolicyById } = useAgentPolicies(osqueryPolicies);

  return useQuery<
    AgentsStrategyResponse,
    unknown,
    {
      total: number;
      groups: ReturnType<typeof processAggregations>;
    }
  >(
    ['agentGroups'],
    async () => {
      const responseData = await lastValueFrom(
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

      return responseData;
    },
    {
      select: (response) => {
        const { platforms, overlap, policies } = processAggregations(
          response.rawResponse.aggregations
        );

        return {
          total: response.total ?? 0,
          groups: {
            platforms,
            overlap,
            policies: policies.map((p) => {
              const name = agentPolicyById[p.id]?.name ?? p.name;

              return {
                ...p,
                name,
              };
            }),
          },
        };
      },
      placeholderData: {
        total: 0,
        edges: [],
        rawResponse: {
          took: 0,
          timed_out: false,
          _shards: {
            failed: 0,
            successful: 0,
            total: 0,
          },
          hits: {
            hits: [],
          },
        },
      },
      refetchOnWindowFocus: false,
      keepPreviousData: true,
      enabled: isOsqueryPoliciesFetched && !agentPoliciesLoading,
      onSuccess: () => setErrorToast(),
      onError: (error) =>
        setErrorToast(error as Error, {
          title: i18n.translate('xpack.osquery.agent_groups.fetchError', {
            defaultMessage: 'Error while fetching agent groups',
          }),
        }),
    }
  );
};
