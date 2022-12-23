/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { useMemo, useCallback } from 'react';
import {
  Chart,
  Metric,
  MetricTrendShape,
  type MetricWNumber,
  type MetricWTrend,
} from '@elastic/charts';

import { EuiPanel } from '@elastic/eui';
import styled from 'styled-components';
import { EuiLoadingChart } from '@elastic/eui';
import { EuiFlexGroup } from '@elastic/eui';
import { EuiFlexItem } from '@elastic/eui';
import { EuiToolTip } from '@elastic/eui';
import type { SnapshotNode, SnapshotNodeMetric } from '../../../../../../common/http_api';
import { createInventoryMetricFormatter } from '../../../inventory_view/lib/create_inventory_metric_formatter';
import type { SnapshotMetricType } from '../../../../../../common/inventory_models/types';

type MetricType = keyof Pick<SnapshotNodeMetric, 'avg' | 'max' | 'value'>;

type AcceptedType = SnapshotMetricType | 'hostsCount';

export interface ChartBaseProps
  extends Pick<
    MetricWTrend,
    'title' | 'color' | 'extra' | 'subtitle' | 'trendA11yDescription' | 'trendA11yTitle'
  > {
  type: AcceptedType;
  toolTip: string;
  metricType: MetricType;
}

interface Props extends ChartBaseProps {
  id: string;
  nodes: SnapshotNode[];
  loading: boolean;
  overrideValue?: number;
}

export const MetricsChart = ({
  color,
  extra,
  id,
  loading,
  metricType,
  nodes,
  overrideValue,
  subtitle,
  title,
  toolTip,
  trendA11yDescription,
  trendA11yTitle,
  type,
}: Props) => {
  const metrics = useMemo(() => (nodes ?? [])[0]?.metrics ?? [], [nodes]);

  const getTimeseries = useCallback(
    (metricName: AcceptedType) => {
      if (!metrics || !metrics.length) {
        return null;
      }
      return metrics.find((m) => m.name === metricName)?.timeseries;
    },
    [metrics]
  );

  const getValue = useCallback(
    (metricName: AcceptedType) => {
      if (!metrics || !metrics.length) {
        return 0;
      }
      return metrics.find((m) => m.name === metricName)?.[metricType] ?? 0;
    },
    [metrics, metricType]
  );

  const metricsTimeseries = useMemo(() => getTimeseries(type), [getTimeseries, type]);
  const metricsValue = useMemo(
    () => overrideValue ?? getValue(type),
    [getValue, overrideValue, type]
  );

  const metricData: MetricWNumber = {
    title,
    subtitle,
    color,
    extra,
    value: metricsValue,
    valueFormatter: (d: number) =>
      type === 'hostsCount' ? d.toString() : createInventoryMetricFormatter({ type })(d),
    ...(!!metricsTimeseries
      ? {
          trend: metricsTimeseries.rows.map((row) => ({ x: row.timestamp, y: row.metric_0 ?? 0 })),
          trendShape: MetricTrendShape.Area,
          trendA11yTitle,
          trendA11yDescription,
        }
      : {}),
  };

  return (
    <EuiPanel paddingSize="none">
      {loading ? (
        <EuiFlexGroup style={{ minHeight: 150 }} justifyContent="center" alignItems="center">
          <EuiFlexItem grow={false}>
            <EuiLoadingChart />
          </EuiFlexItem>
        </EuiFlexGroup>
      ) : (
        <EuiToolTip
          className="eui-fullWidth"
          delay="long"
          content={toolTip}
          anchorClassName="eui-fullWidth"
        >
          <ChartStyled size={{ height: 150 }}>
            <Metric id={id} data={[[metricData]]} />
          </ChartStyled>
        </EuiToolTip>
      )}
    </EuiPanel>
  );
};

const ChartStyled = styled(Chart)`
  .echMetric {
    border-radius: 5px;
  }
`;
