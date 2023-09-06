/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';

import { EuiSpacer } from '@elastic/eui';
import type { DataView } from '@kbn/data-views-plugin/public';
import type { TimeRange } from '@kbn/es-query';
import {
  nginxStubstatusMetrics,
  nginxAccessMetrics,
} from '../../../../../common/visualizations/lens/dashboards/asset_details/host/nginx_charts';
import { assetDetailsDashboards } from '../../../../../common/visualizations';
import { ChartGrid, Section } from './metrics_charts_section';
import { MetricsSectionTitle, NginxMetricsSectionTitle } from './metrics_title';

interface Props {
  assetName: string;
  timeRange: TimeRange;
  metricsDataView?: DataView;
  logsDataView?: DataView;
}

export const MetricsGrid = React.memo(
  ({ assetName, metricsDataView, logsDataView, timeRange }: Props) => {
    return (
      <>
        <Section title={MetricsSectionTitle}>
          <ChartGrid
            assetName={assetName}
            timeRange={timeRange}
            charts={assetDetailsDashboards.host.hostMetricChartsFullPage}
            metricsDataView={metricsDataView}
            logsDataView={logsDataView}
            data-test-subj="infraAssetDetailsMetricsChart"
          />
        </Section>
        <EuiSpacer size="s" />
        <Section dependsOn={['nginx.stubstatus', 'nginx.access']} title={NginxMetricsSectionTitle}>
          <ChartGrid
            assetName={assetName}
            timeRange={timeRange}
            charts={[
              ...nginxStubstatusMetrics.map((n) => ({
                ...n,
                dependsOn: ['nginx.stubstatus'],
              })),
              ...nginxAccessMetrics.map((n) => ({
                ...n,
                dependsOn: ['nginx.access'],
              })),
            ]}
            metricsDataView={metricsDataView}
            logsDataView={logsDataView}
            data-test-subj="infraAssetDetailsNginxMetricsChart"
          />
        </Section>
      </>
    );
  }
);

export const MetricsGridCompact = ({
  assetName,
  metricsDataView,
  logsDataView,
  timeRange,
}: Props) => (
  <Section title={MetricsSectionTitle}>
    <ChartGrid
      assetName={assetName}
      timeRange={timeRange}
      charts={assetDetailsDashboards.host.hostMetricCharts}
      metricsDataView={metricsDataView}
      logsDataView={logsDataView}
      data-test-subj="infraAssetDetailsMetricsChart"
    />
  </Section>
);
