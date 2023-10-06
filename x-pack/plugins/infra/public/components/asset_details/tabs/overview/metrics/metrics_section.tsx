/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { useMemo } from 'react';

import { EuiFlexItem } from '@elastic/eui';
import type { DataView } from '@kbn/data-views-plugin/public';
import type { TimeRange } from '@kbn/es-query';
import { EuiFlexGroup } from '@elastic/eui';
import { assetDetailsDashboards } from '../../../../../common/visualizations';
import {
  MetricsSectionTitle,
  NginxMetricsSectionTitle,
  KubernetesMetricsSectionTitle,
} from '../../../components/section_titles';
import { useMetadataStateProviderContext } from '../../../hooks/use_metadata_state';
import { MetricsGrid } from './metrics_grid';

interface Props {
  assetName: string;
  dateRange: TimeRange;
  metricsDataView?: DataView;
  logsDataView?: DataView;
}

const { host, nginx, kubernetes } = assetDetailsDashboards;

export const MetricsSection = ({ assetName, metricsDataView, logsDataView, dateRange }: Props) => {
  return (
    <EuiFlexGroup direction="column" gutterSize="s">
      <Section title={MetricsSectionTitle}>
        <MetricsGrid
          assetName={assetName}
          dateRange={dateRange}
          charts={host.hostMetricChartsFullPage}
          filterFieldName={host.keyField}
          metricsDataView={metricsDataView}
          logsDataView={logsDataView}
          data-test-subj="infraAssetDetailsMetricsChart"
        />
      </Section>
      <Section dependsOn={kubernetes.dependsOn} title={KubernetesMetricsSectionTitle}>
        <MetricsGrid
          assetName={assetName}
          dateRange={dateRange}
          filterFieldName={kubernetes.keyField}
          charts={kubernetes.kubernetesCharts}
          metricsDataView={metricsDataView}
          logsDataView={logsDataView}
          data-test-subj="infraAssetDetailsKubernetesMetricsChart"
        />
      </Section>
      <Section dependsOn={nginx.dependsOn} title={NginxMetricsSectionTitle}>
        <MetricsGrid
          assetName={assetName}
          dateRange={dateRange}
          filterFieldName={nginx.keyField}
          charts={[
            ...nginx.nginxStubstatusCharts.map((chart) => ({
              ...chart,
              dependsOn: ['nginx.stubstatus'],
            })),
            ...nginx.nginxAccessCharts.map((chart) => ({
              ...chart,
              dependsOn: ['nginx.access'],
            })),
          ]}
          metricsDataView={metricsDataView}
          logsDataView={logsDataView}
          data-test-subj="infraAssetDetailsNginxMetricsChart"
        />
      </Section>
    </EuiFlexGroup>
  );
};

export const MetricsSectionCompact = ({
  assetName,
  metricsDataView,
  logsDataView,
  dateRange,
}: Props) => (
  <Section title={MetricsSectionTitle}>
    <MetricsGrid
      assetName={assetName}
      dateRange={dateRange}
      filterFieldName={host.keyField}
      charts={host.hostMetricFlyoutCharts}
      metricsDataView={metricsDataView}
      logsDataView={logsDataView}
      data-test-subj="infraAssetDetailsMetricsChart"
    />
  </Section>
);

const Section = ({
  title,
  dependsOn = [],
  children,
}: {
  title: React.FunctionComponent;
  dependsOn?: string[];
  children: React.ReactNode;
}) => {
  const Title = title;
  const { metadata } = useMetadataStateProviderContext();

  const shouldRender = useMemo(
    () =>
      dependsOn.length === 0 ||
      dependsOn.some((p) => (metadata?.features ?? []).some((f) => f.name === p)),
    [dependsOn, metadata?.features]
  );

  return shouldRender ? (
    <EuiFlexGroup gutterSize="m" direction="column">
      <EuiFlexItem grow={false}>
        <Title />
      </EuiFlexItem>
      <EuiFlexItem grow={false}>{children}</EuiFlexItem>
    </EuiFlexGroup>
  ) : null;
};
