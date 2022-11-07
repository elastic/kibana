/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useFetcher } from '@kbn/observability-plugin/public';
import { PolicyFromES } from '@kbn/index-lifecycle-management-plugin/common/types';
import { CatIndicesResponse } from '@elastic/elasticsearch/lib/api/types';
import { formatBytes } from '../../step_details_page/hooks/use_object_metrics';
import { SYNTHETICS_API_URLS } from '../../../../../../common/constants';
import { apiService } from '../../../../../utils/api_service';

const policyLabels = [
  { name: 'synthetics', label: 'All Checks' },
  { name: 'synthetics-synthetics.browser-default_policy', label: 'Browser Checks' },
  { name: 'synthetics-synthetics.browser_network-default_policy', label: 'Browser Network Checks' },
  { name: 'synthetics-synthetics.browser_screenshot-default_policy', label: 'Browser Screenshots' },
  { name: 'synthetics-synthetics.http-default_policy', label: 'HTTP Pings' },
  { name: 'synthetics-synthetics.icmp-default_policy', label: 'ICMP Pings' },
  { name: 'synthetics-synthetics.tcp-default_policy', label: 'TCP Pings' },
];

export const useGetIlmPolicies = () => {
  const { data, error, loading } = useFetcher(async () => {
    return getIlmPolicies();
  }, []);

  const { data: sizeData } = useFetcher(async () => {
    return getIndicesData();
  }, []);

  const syntheticsILMPolicies = data?.filter(({ name }) => name.includes('synthetics')) ?? [];

  return {
    data: policyLabels.map(({ name, label }) => {
      const policy = syntheticsILMPolicies.find((p) => p.name === name);
      const policyIndices = sizeData?.data?.filter((d) => policy?.indices?.includes(d.index!));

      let totalSize =
        policyIndices?.reduce((acc, curr) => {
          return acc + Number(curr?.['store.size']) ?? 0;
        }, 0) ?? 0;

      const phases = policy?.policy.phases ?? {};

      const deletePhase = phases.delete;

      if (name === 'synthetics') {
        totalSize =
          sizeData?.data?.reduce((acc, curr) => {
            return acc + Number(curr?.['store.size']) ?? 0;
          }, 0) ?? 0;
      }

      return {
        name,
        label,
        policy,
        retentionPeriod: deletePhase?.min_age ?? '',
        currentSize: formatBytes(totalSize),
      };
    }),
    error,
    loading,
  };
};

export const getIlmPolicies = async (): Promise<PolicyFromES[]> => {
  return await apiService.get('/api/index_lifecycle_management/policies');
};

export const getIndicesData = async (): Promise<{ data: CatIndicesResponse }> => {
  return await apiService.get(SYNTHETICS_API_URLS.INDEX_SIZE);
};
