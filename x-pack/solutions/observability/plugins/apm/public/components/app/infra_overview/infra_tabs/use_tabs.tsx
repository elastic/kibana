/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { EuiTabbedContentProps } from '@elastic/eui';
import { useMemo } from 'react';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import React from 'react';
import { EuiSpacer, EuiLoadingSpinner } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type { ApmPluginStartDeps } from '../../../../plugin';
import { InfrastructureDashboard } from './static_dashboard';
import { useMetricsDataView } from './static_dashboard/use_metrics_data_view';

type Tab = NonNullable<EuiTabbedContentProps['tabs']>[0] & {
  id: 'containers' | 'hosts' | 'deployments';
  hidden?: boolean;
};

export enum InfraTab {
  containers = 'containers',
  hosts = 'hosts',
  deployments = 'deployments',
}

export function useTabs({
  containerIds,
  hostNames,
  podNames,
  deploymentNames,
  nodeNames,
  start,
  end,
}: {
  containerIds: string[];
  hostNames: string[];
  podNames: string[];
  deploymentNames: string[];
  nodeNames: string[];
  start: string;
  end: string;
}) {
  const { services } = useKibana<ApmPluginStartDeps>();
  const { notifications } = services;
  const { dataView } = useMetricsDataView();

  const timerange = useMemo(
    () => ({
      from: start,
      to: end,
    }),
    [start, end]
  );

  const containerDashboard = dataView ? (
    <>
      <EuiSpacer />
      <InfrastructureDashboard
        dashboardType="otel_containers"
        dataView={dataView}
        containerNames={containerIds}
        timeRange={timerange}
        notifications={notifications}
      />
    </>
  ) : (
    <EuiLoadingSpinner size="xl" />
  );

  const hostDashboard = dataView ? (
    <>
      <EuiSpacer />
      <InfrastructureDashboard
        dashboardType="otel_on_host"
        dataView={dataView}
        hostNames={hostNames}
        timeRange={timerange}
        notifications={notifications}
      />
    </>
  ) : (
    <EuiLoadingSpinner size="xl" />
  );

  const deploymentsContent = dataView ? (
    <>
      <EuiSpacer />
      <InfrastructureDashboard
        dashboardType="k8s_deployments_otel"
        dataView={dataView}
        deploymentNames={deploymentNames}
        timeRange={timerange}
        notifications={notifications}
      />
      {nodeNames.length > 0 && (
        <>
          <EuiSpacer size="l" />
          <InfrastructureDashboard
            dashboardType="k8s_nodes_otel"
            dataView={dataView}
            nodeNames={nodeNames}
            timeRange={timerange}
            notifications={notifications}
          />
        </>
      )}
    </>
  ) : (
    <EuiLoadingSpinner size="xl" />
  );

  const tabs: Tab[] = [
    {
      id: InfraTab.deployments,
      name: i18n.translate('xpack.apm.views.infra.tabs.deployments', {
        defaultMessage: 'Deployments',
      }),
      content: deploymentsContent,
      hidden: podNames.length <= 0,
    },
    {
      id: InfraTab.containers,
      name: i18n.translate('xpack.apm.views.infra.tabs.containers', {
        defaultMessage: 'Containers',
      }),
      content: containerDashboard,
      hidden: containerIds.length <= 0,
    },
    {
      id: InfraTab.hosts,
      name: i18n.translate('xpack.apm.views.infra.tabs.hosts', {
        defaultMessage: 'Hosts',
      }),
      content: hostDashboard,
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
