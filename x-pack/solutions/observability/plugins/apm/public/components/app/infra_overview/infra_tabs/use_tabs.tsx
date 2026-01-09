/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { EuiTabbedContentProps } from '@elastic/eui';
import { useMemo } from 'react';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import type { QueryDslQueryContainer } from '@elastic/elasticsearch/lib/api/types';
import React from 'react';
import { EuiSpacer } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type { AgentName } from '@kbn/elastic-agent-utils';
import { isOpenTelemetryAgentName } from '../../../../../common/agent_name';
import type { ApmPluginStartDeps } from '../../../../plugin';
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
  agentName,
}: {
  containerIds: string[];
  podNames: string[];
  hostNames: string[];
  start: string;
  end: string;
  agentName?: string;
}) {
  const { services } = useKibana<ApmPluginStartDeps>();
  const { metricsDataAccess } = services;
  const HostMetricsTable = metricsDataAccess?.HostMetricsTable;
  const OtelHostMetricsTable = metricsDataAccess?.OtelHostMetricsTable;
  const ContainerMetricsTable = metricsDataAccess?.ContainerMetricsTable;
  const PodMetricsTable = metricsDataAccess?.PodMetricsTable;

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
              ['host.name']: hostNames,
            },
          },
        ],
        minimum_should_match: 1,
      },
    }),
    [hostNames]
  );

  // OTel uses resource.attributes.k8s.node.name for Kubernetes node names
  const otelHostsFilter = useMemo(
    (): QueryDslQueryContainer => ({
      bool: {
        should: [
          {
            terms: {
              ['resource.attributes.k8s.node.name']: hostNames,
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
        filter: [{ terms: { ['resource.attributes.k8s.pod.name']: podNames } }],
      },
    }),
    [podNames]
  );
  const containersFilter = useMemo(
    () => ({
      bool: {
        filter: [{ terms: { ['resource.attributes.k8s.container.id']: containerIds } }],
      },
    }),
    [containerIds]
  );

  const containerMetricsTable = (
    <>
      <EuiSpacer />
      {ContainerMetricsTable &&
        ContainerMetricsTable({
          timerange,
          filterClauseDsl: containersFilter,
        })}
    </>
  );

  const podMetricsTable = (
    <>
      <EuiSpacer />
      {PodMetricsTable &&
        PodMetricsTable({
          timerange,
          filterClauseDsl: podsFilter,
        })}
    </>
  );

  const isOtelAgent = agentName ? isOpenTelemetryAgentName(agentName as AgentName) : false;
  const ActiveHostMetricsTable = isOtelAgent ? OtelHostMetricsTable : HostMetricsTable;
  const activeHostsFilter = isOtelAgent ? otelHostsFilter : hostsFilter;

  const hostMetricsTable = (
    <>
      <EuiSpacer />
      {ActiveHostMetricsTable &&
        ActiveHostMetricsTable({
          timerange,
          filterClauseDsl: activeHostsFilter,
        })}
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
