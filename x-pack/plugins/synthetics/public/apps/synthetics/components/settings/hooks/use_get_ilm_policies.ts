/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { useFetcher } from '@kbn/observability-plugin/public';
import { formatBytes } from '../../step_details_page/hooks/use_object_metrics';
import { getIlmPolicies, getIndicesData } from './api';

const policyLabels = [
  {
    name: 'synthetics',
    label: i18n.translate('xpack.synthetics.settingsRoute.allChecks', {
      defaultMessage: 'All Checks',
    }),
    indexTemplate: 'synthetics',
  },
  {
    name: 'synthetics-synthetics.browser-default_policy',
    label: i18n.translate('xpack.synthetics.settingsRoute.browserChecks', {
      defaultMessage: 'Browser Checks',
    }),
    indexTemplate: 'synthetics-browser',
  },
  {
    name: 'synthetics-synthetics.browser_network-default_policy',
    label: i18n.translate('xpack.synthetics.settingsRoute.browserNetworkRequests', {
      defaultMessage: 'Browser Network Requests',
    }),
    indexTemplate: 'synthetics-browser.network',
  },
  {
    name: 'synthetics-synthetics.browser_screenshot-default_policy',
    label: 'Browser Screenshots',
    indexTemplate: 'synthetics-browser.screenshot',
  },
  {
    name: 'synthetics-synthetics.http-default_policy',
    label: 'HTTP Pings',
    indexTemplate: 'synthetics-http',
  },
  {
    name: 'synthetics-synthetics.icmp-default_policy',
    label: 'ICMP Pings',
    indexTemplate: 'synthetics-icmp',
  },
  {
    name: 'synthetics-synthetics.tcp-default_policy',
    label: 'TCP Pings',
    indexTemplate: 'synthetics-tcp',
  },
];

export const useGetIlmPolicies = () => {
  const { data, error, loading } = useFetcher(async () => {
    return getIlmPolicies();
  }, []);

  const { data: sizeData, loading: indicesLoading } = useFetcher(async () => {
    return getIndicesData();
  }, []);

  const syntheticsILMPolicies =
    data?.filter(({ indexTemplates }) =>
      indexTemplates?.some((indTemp) => indTemp.includes('synthetics'))
    ) ?? [];

  return {
    data: policyLabels.map(({ name, label, indexTemplate }) => {
      const policy = syntheticsILMPolicies.find((p) =>
        p.indexTemplates?.some((indTemp) => indTemp.includes(indexTemplate))
      );
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
        retentionPeriod: formatAge(deletePhase?.min_age),
        currentSize: formatBytes(totalSize),
      };
    }),
    error,
    loading: loading || indicesLoading,
  };
};

const formatAge = (age?: string) => {
  if (!age) {
    return '';
  }
  const [value] = age.split('d');
  return i18n.translate('xpack.synthetics.settingsRoute.table.retentionPeriodValue', {
    defaultMessage: '{value} days + rollover',
    values: { value },
  });
};
