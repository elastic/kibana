/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';

import { EuiFlexGroup } from '@elastic/eui';
import type { DataView } from '@kbn/data-views-plugin/public';
import type { TimeRange } from '@kbn/es-query';
import { assetDetailsDashboards } from '../../../../../common/visualizations';
import { ChartGrid, Section } from './metrics_charts_section';
import {
  MetricsSectionTitle,
  NginxMetricsSectionTitle,
  KubernetesMetricsSectionTitle,
} from '../../../components/section_titles';

interface Props {
  assetName: string;
  dateRange: TimeRange;
  metricsDataView?: DataView;
  logsDataView?: DataView;
}

const { host, nginx, kubernetes } = assetDetailsDashboards;

export const MetricsGrid = React.memo(
  ({ assetName, metricsDataView, logsDataView, dateRange: timeRange }: Props) => {
    return (
      <EuiFlexGroup direction="column" gutterSize="s">
        <Section title={MetricsSectionTitle}>
          <ChartGrid
            assetName={assetName}
            timeRange={timeRange}
            charts={host.hostMetricChartsFullPage}
            filterFieldName={host.keyField}
            metricsDataView={metricsDataView}
            logsDataView={logsDataView}
            data-test-subj="infraAssetDetailsMetricsChart"
          />
        </Section>
        <Section dependsOn={kubernetes.dependsOn} title={KubernetesMetricsSectionTitle}>
          <ChartGrid
            assetName={assetName}
            timeRange={timeRange}
            filterFieldName={kubernetes.keyField}
            charts={kubernetes.kubernetesCharts}
            metricsDataView={metricsDataView}
            logsDataView={logsDataView}
            data-test-subj="infraAssetDetailsNginxMetricsChart"
          />
        </Section>
        <Section dependsOn={nginx.dependsOn} title={NginxMetricsSectionTitle}>
          <ChartGrid
            assetName={assetName}
            timeRange={timeRange}
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
  }
);

export const MetricsGridCompact = ({
  assetName,
  metricsDataView,
  logsDataView,
  dateRange: timeRange,
}: Props) => (
  <Section title={MetricsSectionTitle}>
    <ChartGrid
      assetName={assetName}
      timeRange={timeRange}
      filterFieldName={host.keyField}
      charts={host.hostMetricFlyoutCharts}
      metricsDataView={metricsDataView}
      logsDataView={logsDataView}
      data-test-subj="infraAssetDetailsMetricsChart"
    />
  </Section>
);
