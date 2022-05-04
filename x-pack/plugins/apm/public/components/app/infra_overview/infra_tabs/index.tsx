/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiTabbedContent,
  EuiTabbedContentProps,
  EuiLoadingSpinner,
} from '@elastic/eui';
import React, { useMemo } from 'react';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import type { QueryDslQueryContainer } from '@elastic/elasticsearch/lib/api/types';
import { useApmServiceContext } from '../../../../context/apm_service/use_apm_service_context';
import { useApmParams } from '../../../../hooks/use_apm_params';
import { useTimeRange } from '../../../../hooks/use_time_range';
import { FETCH_STATUS, useFetcher } from '../../../../hooks/use_fetcher';
import { ApmPluginStartDeps } from '../../../../plugin';

type Tab = NonNullable<EuiTabbedContentProps['tabs']>[0] & {
  id: 'containers' | 'pods' | 'hosts';
  hidden?: boolean;
};

export function InfraTabs() {
  const { serviceName } = useApmServiceContext();
  const {
    query: { environment, kuery, rangeFrom, rangeTo },
  } = useApmParams('/services/{serviceName}/infra');
  const { start, end } = useTimeRange({ rangeFrom, rangeTo });

  const { data, status } = useFetcher(
    (callApmApi) => {
      if (start && end) {
        return callApmApi('GET /internal/apm/services/{serviceName}/infra', {
          params: {
            path: { serviceName },
            query: {
              environment,
              kuery,
              start,
              end,
            },
          },
        });
      }
    },
    [environment, kuery, serviceName, start, end]
  );

  const tabs = useTabs({
    containerIds: data?.infrastructureData.containerIds || [],
    podNames: data?.infrastructureData.podNames || [],
    hostNames: data?.infrastructureData.hostNames || [],
    start,
    end,
  });

  if (status === FETCH_STATUS.LOADING) {
    return (
      <div style={{ textAlign: 'center' }}>
        <EuiLoadingSpinner size="l" />
      </div>
    );
  }

  return (
    <>
      <EuiTabbedContent
        tabs={tabs}
        initialSelectedTab={tabs[0]}
        autoFocus="selected"
        onTabClick={(tab) => {}}
      />
    </>
  );
}

function useTabs({
  containerIds,
  podNames,
  hostNames,
  start,
  end,
}: {
  containerIds: string[];
  podNames: string[];
  hostNames: string[];
  start: string;
  end: string;
}) {
  const { services } = useKibana<ApmPluginStartDeps>();
  const { infra } = services;
  const HostMetricsTable = infra?.HostMetricsTable;
  const ContainerMetricsTable = infra?.ContainerMetricsTable;
  const PodMetricsTable = infra?.PodMetricsTable;

  const timerange = useMemo(
    () => ({
      from: start,
      to: end,
    }),
    [start, end]
  );

  const hostsFilter = useMemo(
    (): QueryDslQueryContainer => ({
      bool: {
        should: [
          { terms: { 'host.name': hostNames } },
          {
            terms: {
              'container.id': containerIds,
            },
          },
          { terms: { 'kubernetes.pod.name': podNames } },
        ],
        minimum_should_match: 1,
      },
    }),
    [hostNames, containerIds, podNames]
  );
  const testFilter = useMemo(
    () => ({
      bool: {
        filter: [
          { terms: { 'host.name': ['gke-edge-oblt-pool-1-9a60016d-lwwa'] } },
        ],
      },
    }),
    []
  );
  const podsFilter = useMemo(
    () => ({
      bool: {
        filter: [{ terms: { 'kubernetes.pod.name': podNames } }],
      },
    }),
    [podNames]
  );
  const containersFilter = useMemo(
    () => ({
      bool: {
        filter: [{ terms: { 'container.id': containerIds } }],
      },
    }),
    [containerIds]
  );

  const tabs: Tab[] = [
    {
      id: 'containers',
      name: 'Containers',
      content:
        ContainerMetricsTable &&
        ContainerMetricsTable({ timerange, filterClauseDsl: containersFilter }),
      hidden: containerIds && containerIds.length <= 0,
    },
    {
      id: 'pods',
      name: 'Pods',
      content:
        PodMetricsTable &&
        PodMetricsTable({ timerange, filterClauseDsl: podsFilter }),
      hidden: podNames && podNames.length <= 0,
    },
    {
      id: 'hosts',
      name: 'Hosts',
      content:
        HostMetricsTable &&
        HostMetricsTable({ timerange, filterClauseDsl: testFilter }),
    },
  ];

  return tabs
    .filter((t) => !t.hidden)
    .map(({ id, name, content }) => ({
      id,
      name,
      content,
    }));
}
