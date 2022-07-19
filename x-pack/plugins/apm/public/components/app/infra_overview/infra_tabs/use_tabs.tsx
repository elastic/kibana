/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { EuiTabbedContentProps } from '@elastic/eui';
import { useMemo } from 'react';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import type { QueryDslQueryContainer } from '@elastic/elasticsearch/lib/api/types';
import React from 'react';
import { EuiSpacer } from '@elastic/eui';
import { ApmPluginStartDeps } from '../../../../plugin';

type Tab = NonNullable<EuiTabbedContentProps['tabs']>[0] & {
  id: 'containers' | 'pods' | 'hosts';
  hidden?: boolean;
};

export function useTabs({
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
          {
            terms: {
              'host.name': hostNames,
            },
          },
        ],
        minimum_should_match: 1,
      },
    }),
    [hostNames]
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

  const containerMetricsTable = (
    <>
      <EuiSpacer />
      {ContainerMetricsTable &&
        ContainerMetricsTable({ timerange, filterClauseDsl: containersFilter })}
    </>
  );

  const podMetricsTable = (
    <>
      <EuiSpacer />
      {PodMetricsTable &&
        PodMetricsTable({ timerange, filterClauseDsl: podsFilter })}
    </>
  );

  const hostMetricsTable = (
    <>
      <EuiSpacer />
      {HostMetricsTable &&
        HostMetricsTable({ timerange, filterClauseDsl: hostsFilter })}
    </>
  );

  const tabs: Tab[] = [
    {
      id: 'containers',
      name: 'Containers',
      content: containerMetricsTable,
      hidden: containerIds && containerIds.length <= 0,
    },
    {
      id: 'pods',
      name: 'Pods',
      content: podMetricsTable,
      hidden: podNames && podNames.length <= 0,
    },
    {
      id: 'hosts',
      name: 'Hosts',
      content: hostMetricsTable,
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
