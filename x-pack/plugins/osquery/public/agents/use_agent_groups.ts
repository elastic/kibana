/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { useState } from 'react';
import { useQuery } from 'react-query';
import { useKibana } from '../common/lib/kibana';
import { useOsqueryPolicies } from './use_osquery_policies';

import {
  OsqueryQueries,
  AgentsRequestOptions,
  AgentsStrategyResponse,
} from '../../common/search_strategy';

import { generateTablePaginationOptions } from './helpers';
import { Overlap } from './types';

interface Group {
  name: string;
  size: number;
}

export const useAgentGroups = () => {
  const { data } = useKibana().services;
  const { osqueryPolicies, osqueryPoliciesLoading } = useOsqueryPolicies();

  const [platforms, setPlatforms] = useState<Group[]>([]);
  const [policyOptions, setPolicyOptions] = useState<Group[]>([]);
  const [loading, setLoading] = useState(true);
  const [overlap, setOverlap] = useState<Overlap>(() => ({}));
  const [totalCount, setTotalCount] = useState<number>(0);
  useQuery(['agentGroups', osqueryPoliciesLoading], async () => {
    if (osqueryPoliciesLoading) return null;
    const responseData = await data.search
      .search<AgentsRequestOptions, AgentsStrategyResponse>(
        {
          filterQuery: { terms: { policy_id: osqueryPolicies } },
          factoryQueryType: OsqueryQueries.agents,
          aggregations: {
            platforms: {
              field: 'local_metadata.os.platform',
              subaggs: { policies: 'policy_id' },
            },
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
        }
      )
      .toPromise();
    setLoading(false);
    if (responseData.aggregations) {
      const aggs = responseData.aggregations;
      const newPlatforms: Group[] = [];
      const newOverlap: Overlap = {};
      for (const { key, doc_count: docCount, policies } of aggs.platforms.buckets) {
        newPlatforms.push({ name: key, size: docCount });
        newOverlap[key] = policies.buckets.reduce(
          (acc: { [key: string]: number }, pol: { key: string; doc_count: number }) => {
            acc[pol.key] = pol.doc_count;
            return acc;
          },
          {} as { [key: string]: number }
        );
      }
      setPlatforms(newPlatforms);
      setOverlap(newOverlap);
      setPolicyOptions(aggs.policies.buckets.map((o) => ({ name: o.key, size: o.doc_count })));
    }
    setTotalCount(responseData.totalCount);
  });

  return {
    loading,
    totalCount,
    groups: {
      platforms,
      policies: policyOptions,
      overlap,
    },
  };
};
