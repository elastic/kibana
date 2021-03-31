/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { useState } from 'react';
import { useQuery } from 'react-query';
import { useKibana } from '../common/lib/kibana';

import {
  OsqueryQueries,
  AgentsRequestOptions,
  AgentsStrategyResponse,
} from '../../common/search_strategy';

import { generateTablePaginationOptions, processAggregations } from './helpers';
import { Overlap, Group } from './types';

interface UseAgentGroups {
  osqueryPolicies: string[];
  osqueryPoliciesLoading: boolean;
}

export const useAgentGroups = ({ osqueryPolicies, osqueryPoliciesLoading }: UseAgentGroups) => {
  const { data } = useKibana().services;

  const [platforms, setPlatforms] = useState<Group[]>([]);
  const [policies, setPolicies] = useState<Group[]>([]);
  const [loading, setLoading] = useState(true);
  const [overlap, setOverlap] = useState<Overlap>(() => ({}));
  const [totalCount, setTotalCount] = useState<number>(0);
  useQuery(
    ['agentGroups'],
    async () => {
      const responseData = await data.search
        .search<AgentsRequestOptions, AgentsStrategyResponse>(
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
        .toPromise();

      if (responseData.rawResponse.aggregations) {
        const {
          platforms: newPlatforms,
          overlap: newOverlap,
          policies: newPolicies,
        } = processAggregations(responseData.rawResponse.aggregations);

        setPlatforms(newPlatforms);
        setOverlap(newOverlap);
        setPolicies(newPolicies);
      }

      setLoading(false);
      setTotalCount(responseData.totalCount);
    },
    {
      enabled: !osqueryPoliciesLoading,
    }
  );

  return {
    loading,
    totalCount,
    groups: {
      platforms,
      policies,
      overlap,
    },
  };
};
