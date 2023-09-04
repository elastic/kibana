/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { useCallback } from 'react';

import { EuiFlexGrid, EuiFlexItem, EuiTitle, EuiSpacer, EuiFlexGroup } from '@elastic/eui';
import type { DataView } from '@kbn/data-views-plugin/public';
import type { TimeRange } from '@kbn/es-query';
import { FormattedMessage } from '@kbn/i18n-react';
import { LensEmbeddableInput } from '@kbn/lens-plugin/public';
import type { XYConfig } from '../../../../../common/visualizations/lens/dashboards/asset_details/metric_charts/types';
import {
  nginxStubstatusMetrics,
  nginxAccessMetrics,
} from '../../../../../common/visualizations/lens/dashboards/asset_details/host/nginx_charts';
import {
  assetDetailsDashboards,
  XY_MISSING_VALUE_DOTTED_LINE_CONFIG,
} from '../../../../../common/visualizations';
import { buildCombinedHostsFilter } from '../../../../../utils/filters/build';
import { LensChart, HostMetricsExplanationContent } from '../../../../lens';
import { METRIC_CHART_HEIGHT } from '../../../constants';
import { Popover } from '../../common/popover';
import type { DataViewOrigin } from '../../../types';
import { useDateRangeProviderContext } from '../../../hooks/use_date_range';

type BrushEndArgs = Parameters<NonNullable<LensEmbeddableInput['onBrushEnd']>>[0];

interface CompactProps {
  nodeName: string;
  timeRange: TimeRange;
  metricsDataView?: DataView;
  logsDataView?: DataView;
}

interface MetricsChartsWrapperProps {
  nodeName: string;
  timeRange: TimeRange;
  metricsDataView?: DataView;
  logsDataView?: DataView;
  charts: XYConfig[];
  SectionTitle: React.FunctionComponent;
}

interface Props extends CompactProps {
  showNginxStubstatus: boolean;
  showNginxAccess: boolean;
}

const MetricsSectionTitle = () => {
  return (
    <EuiFlexGroup gutterSize="xs" alignItems="center">
      <EuiFlexItem grow={false}>
        <EuiTitle size="xxs">
          <span>
            <FormattedMessage
              id="xpack.infra.assetDetails.overview.metricsSectionTitle"
              defaultMessage="Metrics"
            />
          </span>
        </EuiTitle>
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <Popover icon="iInCircle" data-test-subj="infraAssetDetailsMetricsPopoverButton">
          <HostMetricsExplanationContent />
        </Popover>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};

const NginxMetricsSectionTitle = () => (
  <EuiTitle size="xxs">
    <span>
      <FormattedMessage
        id="xpack.infra.assetDetails.overview.nginxMetricsSectionTitle"
        defaultMessage="Nginx Metrics"
      />
    </span>
  </EuiTitle>
);

export const MetricsGrid = React.memo(
  ({
    nodeName,
    metricsDataView,
    logsDataView,
    timeRange,
    showNginxStubstatus,
    showNginxAccess,
  }: Props) => {
    const nginxStubstatusCharts = showNginxStubstatus ? nginxStubstatusMetrics : [];
    const nginxAccessCharts = showNginxAccess ? nginxAccessMetrics : [];
    const shouldShowNginxSection = nginxStubstatusCharts.length > 0 || nginxAccessCharts.length > 0;

    return (
      <>
        <MetricsChartsWrapper
          nodeName={nodeName}
          timeRange={timeRange}
          charts={assetDetailsDashboards.host.hostMetricChartsFullPage}
          SectionTitle={MetricsSectionTitle}
          metricsDataView={metricsDataView}
          logsDataView={logsDataView}
        />
        <EuiSpacer size="s" />
        {shouldShowNginxSection && (
          <MetricsChartsWrapper
            nodeName={nodeName}
            timeRange={timeRange}
            charts={[...nginxStubstatusCharts, ...nginxAccessCharts]}
            SectionTitle={NginxMetricsSectionTitle}
            metricsDataView={metricsDataView}
            logsDataView={logsDataView}
          />
        )}
      </>
    );
  }
);

export const MetricsGridCompact = ({
  nodeName,
  metricsDataView,
  logsDataView,
  timeRange,
}: CompactProps) => (
  <MetricsChartsWrapper
    nodeName={nodeName}
    timeRange={timeRange}
    charts={assetDetailsDashboards.host.hostMetricCharts}
    SectionTitle={MetricsSectionTitle}
    metricsDataView={metricsDataView}
    logsDataView={logsDataView}
  />
);

const MetricsChartsWrapper = React.memo(
  ({
    nodeName,
    metricsDataView,
    logsDataView,
    timeRange,
    charts,
    SectionTitle,
  }: MetricsChartsWrapperProps) => {
    const { setDateRange } = useDateRangeProviderContext();
    const getDataView = useCallback(
      (dataViewOrigin: DataViewOrigin) => {
        return dataViewOrigin === 'metrics' ? metricsDataView : logsDataView;
      },
      [logsDataView, metricsDataView]
    );

    const getFilters = useCallback(
      (dataViewOrigin: DataViewOrigin) => {
        return [
          buildCombinedHostsFilter({
            field: 'host.name',
            values: [nodeName],
            dataView: getDataView(dataViewOrigin),
          }),
        ];
      },
      [getDataView, nodeName]
    );

    const handleBrushEnd = useCallback(
      ({ range, preventDefault }: BrushEndArgs) => {
        setDateRange({
          from: new Date(range[0]).toISOString(),
          to: new Date(range[1]).toISOString(),
        });

        preventDefault();
      },
      [setDateRange]
    );

    return (
      <EuiFlexGroup gutterSize="m" direction="column">
        <EuiFlexItem grow={false}>
          <SectionTitle />
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiSpacer size="s" />
          <EuiFlexGrid
            columns={2}
            gutterSize="s"
            data-test-subj="infraAssetDetailsMetricsChartGrid"
          >
            {charts.map(({ dataViewOrigin, id, layers, title, overrides }, index) => (
              <EuiFlexItem key={index} grow={false}>
                <LensChart
                  id={`infraAssetDetailsMetricsChart${id}`}
                  borderRadius="m"
                  dataView={getDataView(dataViewOrigin)}
                  dateRange={timeRange}
                  height={METRIC_CHART_HEIGHT}
                  visualOptions={XY_MISSING_VALUE_DOTTED_LINE_CONFIG}
                  layers={layers}
                  filters={getFilters(dataViewOrigin)}
                  title={title}
                  overrides={overrides}
                  visualizationType="lnsXY"
                  onBrushEnd={handleBrushEnd}
                />
              </EuiFlexItem>
            ))}
          </EuiFlexGrid>
        </EuiFlexItem>
      </EuiFlexGroup>
    );
  }
);
