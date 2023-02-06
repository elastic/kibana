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
import { i18n } from '@kbn/i18n';
import { ApmPluginStartDeps } from '../../../../plugin';
import {
  KUBERNETES_POD_NAME,
  HOST_NAME,
  CONTAINER_ID,
} from '../../../../../common/es_fields/apm';
type Tab = NonNullable<EuiTabbedContentProps['tabs']>[0] & {
  id: 'containers' | 'pods' | 'hosts';
  hidden?: boolean;
};

export enum InfraTab {
  containers = 'containers',
  pods = 'pods',
  hosts = 'hosts',
}

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
              [HOST_NAME]: hostNames,
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
        filter: [{ terms: { [KUBERNETES_POD_NAME]: podNames } }],
      },
    }),
    [podNames]
  );
  const containersFilter = useMemo(
    () => ({
      bool: {
        filter: [{ terms: { [CONTAINER_ID]: containerIds } }],
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
      id: InfraTab.containers,
      name: i18n.translate('xpack.apm.views.infra.tabs.containers', {
        defaultMessage: 'Containers',
      }),
      content: containerMetricsTable,
      hidden: containerIds && containerIds.length <= 0,
    },
    {
      id: InfraTab.pods,
      name: i18n.translate('xpack.apm.views.infra.tabs.pods', {
        defaultMessage: 'Pods',
      }),
      content: podMetricsTable,
      hidden: podNames && podNames.length <= 0,
    },
    {
      id: InfraTab.hosts,
      name: i18n.translate('xpack.apm.views.infra.tabs.hosts', {
        defaultMessage: 'Hosts',
      }),
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
