/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useCallback, useMemo, useRef } from 'react';
import { first, last } from 'lodash';
import { i18n } from '@kbn/i18n';
import {
  Axis,
  Chart,
  niceTimeFormatter,
  Position,
  Settings,
  TooltipValue,
  PointerEvent,
} from '@elastic/charts';
import moment from 'moment';
import { EuiFlexItem, EuiText, EuiFlexGroup, EuiIcon } from '@elastic/eui';
import { TabContent, TabProps } from './shared';
import { useSnapshot } from '../../../hooks/use_snaphot';
import { useWaffleOptionsContext } from '../../../hooks/use_waffle_options';
import { useSourceContext } from '../../../../../../containers/source';
import { findInventoryFields } from '../../../../../../../common/inventory_models';
import { convertKueryToElasticSearchQuery } from '../../../../../../utils/kuery';
import { SnapshotMetricType } from '../../../../../../../common/inventory_models/types';
import {
  MetricsExplorerChartType,
  MetricsExplorerOptionsMetric,
} from '../../../../metrics_explorer/hooks/use_metrics_explorer_options';
import { Color, colorTransformer } from '../../../../../../../common/color_palette';
import {
  MetricsExplorerAggregation,
  MetricsExplorerSeries,
} from '../../../../../../../common/http_api';
import { MetricExplorerSeriesChart } from '../../../../metrics_explorer/components/series_chart';
import { createInventoryMetricFormatter } from '../../../lib/create_inventory_metric_formatter';
import { calculateDomain } from '../../../../metrics_explorer/components/helpers/calculate_domain';
import { getTimelineChartTheme } from '../../../../metrics_explorer/components/helpers/get_chart_theme';
import { useUiSetting } from '../../../../../../../../../../src/plugins/kibana_react/public';
import { euiStyled } from '../../../../../../../../observability/public';

const TabComponent = (props: TabProps) => {
  const cpuChartRef = useRef<Chart>(null);
  const networkChartRef = useRef<Chart>(null);
  const memoryChartRef = useRef<Chart>(null);
  const loadChartRef = useRef<Chart>(null);
  const { sourceId, createDerivedIndexPattern } = useSourceContext();
  const { nodeType, accountId, region } = useWaffleOptionsContext();
  const { currentTime, options, node } = props;
  const derivedIndexPattern = useMemo(() => createDerivedIndexPattern('metrics'), [
    createDerivedIndexPattern,
  ]);
  let filter = options.fields
    ? `${findInventoryFields(nodeType, options.fields).id}: "${node.id}"`
    : '';

  if (filter) {
    filter = convertKueryToElasticSearchQuery(filter, derivedIndexPattern);
  }

  const buildCustomMetric = useCallback((field: string, id: string) => {
    return {
      type: 'custom' as SnapshotMetricType,
      aggregation: 'avg',
      field,
      id,
    };
  }, []);

  const metrics: Array<{ type: SnapshotMetricType; [k: string]: any }> = [
    { type: 'rx' },
    { type: 'tx' },
    buildCustomMetric('system.cpu.user.pct', 'user'),
    buildCustomMetric('system.cpu.system.pct', 'system'),
    buildCustomMetric('system.load.1', 'load1m'),
    buildCustomMetric('system.load.5', 'load5m'),
    buildCustomMetric('system.load.15', 'load15m'),
    buildCustomMetric('system.memory.actual.used.bytes', 'usedMemory'),
    buildCustomMetric('system.memory.actual.free', 'freeMemory'),
  ];

  const { nodes } = useSnapshot(
    filter,
    metrics,
    [],
    nodeType,
    sourceId,
    currentTime,
    accountId,
    region,
    true
  );

  const getDomain = useCallback(
    (timeseries: MetricsExplorerSeries, ms: MetricsExplorerOptionsMetric[]) => {
      const dataDomain = timeseries ? calculateDomain(timeseries, ms, false) : null;
      return dataDomain
        ? {
            max: dataDomain.max * 1.1, // add 10% headroom.
            min: dataDomain.min,
          }
        : { max: 0, min: 0 };
    },
    []
  );

  const dateFormatter = useCallback((timeseries: MetricsExplorerSeries) => {
    if (!timeseries) return () => '';
    const firstTimestamp = first(timeseries.rows)?.timestamp;
    const lastTimestamp = last(timeseries.rows)?.timestamp;

    if (firstTimestamp == null || lastTimestamp == null) {
      return (value: number) => `${value}`;
    }

    return niceTimeFormatter([firstTimestamp, lastTimestamp]);
  }, []);

  type MetricType = 'network' | 'cpu' | 'memory' | 'load';
  const getFormatter = useCallback((metric: MetricType) => {
    switch (metric) {
      case 'network':
        return createInventoryMetricFormatter({ type: 'rx' });
      case 'cpu':
        return createInventoryMetricFormatter({ type: 'cpu' });
      case 'memory':
        return createInventoryMetricFormatter({ type: 'memory' });
      case 'load':
        return createInventoryMetricFormatter({ type: 'load' });
    }
  }, []);

  const mergeTimeseries = useCallback((...series: MetricsExplorerSeries[]) => {
    const base = series[0];
    const otherSeries = series.slice(1);
    base.rows = base.rows.map((b, rowIdx) => {
      const newRow = { ...b };
      otherSeries.forEach((o, idx) => {
        newRow[`metric_${idx + 1}`] = o.rows[rowIdx].metric_0;
      });
      return newRow;
    });
    return base;
  }, []);

  const buildChartMetricLabels = useCallback((labels: string[]) => {
    const baseMetric = {
      color: Color.color0,
      aggregation: 'avg' as MetricsExplorerAggregation,
      label: 'System',
    };

    return labels.map((label, idx) => {
      return { ...baseMetric, color: Color[`color${idx}` as Color], label };
    });
  }, []);

  const pointerUpdate = useCallback(
    (event: PointerEvent) => {
      if (cpuChartRef.current) {
        cpuChartRef.current.dispatchExternalPointerEvent(event);
      }
      if (loadChartRef.current) {
        loadChartRef.current.dispatchExternalPointerEvent(event);
      }
      if (networkChartRef.current) {
        networkChartRef.current.dispatchExternalPointerEvent(event);
      }
      if (memoryChartRef.current) {
        memoryChartRef.current.dispatchExternalPointerEvent(event);
      }
    },
    [cpuChartRef, loadChartRef, networkChartRef, memoryChartRef]
  );

  const isDarkMode = useUiSetting<boolean>('theme:darkMode');
  const tooltipProps = {
    headerFormatter: (tooltipValue: TooltipValue) =>
      moment(tooltipValue.value).format('Y-MM-DD HH:mm:ss.SSS'),
  };

  if (!nodes.length) {
    return <div />;
  }

  const systemMetrics = nodes[0].metrics.find((m) => m.name === 'system')!;
  const userMetrics = nodes[0].metrics.find((m) => m.name === 'user')!;
  const rxMetrics = nodes[0].metrics.find((m) => m.name === 'rx')!;
  const txMetrics = nodes[0].metrics.find((m) => m.name === 'tx')!;
  const load1mMetrics = nodes[0].metrics.find((m) => m.name === 'load1m')!;
  const load5mMetrics = nodes[0].metrics.find((m) => m.name === 'load5m')!;
  const load15mMetrics = nodes[0].metrics.find((m) => m.name === 'load15m')!;
  const usedMemoryMetrics = nodes[0].metrics.find((m) => m.name === 'usedMemory')!;
  const freeMemoryMetrics = nodes[0].metrics.find((m) => m.name === 'freeMemory')!;

  const cpuChartMetrics = buildChartMetricLabels(['System', 'User']);
  const networkChartMetrics = buildChartMetricLabels(['Network In', 'Network Out']);
  const loadChartMetrics = buildChartMetricLabels(['Load 1', 'Load 5', 'Load 15']);
  const memoryChartMetrics = buildChartMetricLabels(['Used', 'Free']);

  const cpuTimeseries = mergeTimeseries(systemMetrics.timeseries!, userMetrics.timeseries!);
  const networkTimeseries = mergeTimeseries(rxMetrics.timeseries!, txMetrics.timeseries!);
  const loadTimeseries = mergeTimeseries(
    load1mMetrics.timeseries!,
    load5mMetrics.timeseries!,
    load15mMetrics.timeseries!
  );
  // TODO: get memory stuff
  const memoryTimeseries = mergeTimeseries(
    usedMemoryMetrics.timeseries!,
    freeMemoryMetrics.timeseries!
  );

  const formatter = dateFormatter(rxMetrics.timeseries!);

  return (
    <TabContent>
      <ChartsContainer>
        <ChartContainerWrapper>
          <ChartHeader title="CPU %" metrics={cpuChartMetrics} />
          <ChartContainer>
            <Chart ref={cpuChartRef}>
              <MetricExplorerSeriesChart
                type={MetricsExplorerChartType.line}
                metric={cpuChartMetrics[0]}
                id={'0'}
                series={systemMetrics.timeseries!}
                stack={false}
              />
              <MetricExplorerSeriesChart
                type={MetricsExplorerChartType.line}
                metric={cpuChartMetrics[1]}
                id={'0'}
                series={userMetrics.timeseries!}
                stack={false}
              />
              <Axis
                id={'timestamp'}
                position={Position.Bottom}
                showOverlappingTicks={true}
                tickFormat={formatter}
              />
              <Axis
                id={'values'}
                position={Position.Left}
                tickFormat={getFormatter('cpu')}
                domain={getDomain(cpuTimeseries, cpuChartMetrics)}
                ticks={6}
                showGridLines
              />
              <Settings
                onPointerUpdate={pointerUpdate}
                tooltip={tooltipProps}
                theme={getTimelineChartTheme(isDarkMode)}
              />
            </Chart>
          </ChartContainer>
        </ChartContainerWrapper>

        <ChartContainerWrapper>
          <ChartHeader title="Load" metrics={loadChartMetrics} />
          <ChartContainer>
            <Chart ref={loadChartRef}>
              <MetricExplorerSeriesChart
                type={MetricsExplorerChartType.line}
                metric={loadChartMetrics[0]}
                id="0"
                series={load1mMetrics.timeseries!}
                stack={false}
              />
              <MetricExplorerSeriesChart
                type={MetricsExplorerChartType.line}
                metric={loadChartMetrics[1]}
                id="0"
                series={load5mMetrics.timeseries!}
                stack={false}
              />
              <MetricExplorerSeriesChart
                type={MetricsExplorerChartType.line}
                metric={loadChartMetrics[2]}
                id="0"
                series={load15mMetrics.timeseries!}
                stack={false}
              />
              <Axis
                id={'timestamp'}
                position={Position.Bottom}
                showOverlappingTicks={true}
                tickFormat={formatter}
              />
              <Axis
                id={'values1'}
                position={Position.Left}
                tickFormat={getFormatter('load')}
                domain={getDomain(loadTimeseries, loadChartMetrics)}
                ticks={6}
                showGridLines
              />
              <Settings
                onPointerUpdate={pointerUpdate}
                tooltip={tooltipProps}
                theme={getTimelineChartTheme(isDarkMode)}
              />
            </Chart>
          </ChartContainer>
        </ChartContainerWrapper>

        <ChartContainerWrapper>
          <ChartHeader title="Memory" metrics={memoryChartMetrics} />
          <ChartContainer>
            <Chart ref={memoryChartRef}>
              <MetricExplorerSeriesChart
                type={MetricsExplorerChartType.line}
                metric={memoryChartMetrics[0]}
                id="0"
                series={usedMemoryMetrics.timeseries!}
                stack={false}
              />
              <MetricExplorerSeriesChart
                type={MetricsExplorerChartType.line}
                metric={memoryChartMetrics[1]}
                id="0"
                series={freeMemoryMetrics.timeseries!}
                stack={false}
              />
              <Axis
                id={'timestamp'}
                position={Position.Bottom}
                showOverlappingTicks={true}
                tickFormat={formatter}
              />
              <Axis
                id={'values'}
                position={Position.Left}
                tickFormat={getFormatter('network')}
                domain={getDomain(memoryTimeseries, memoryChartMetrics)}
                ticks={6}
                showGridLines
              />
              <Settings
                onPointerUpdate={pointerUpdate}
                tooltip={tooltipProps}
                theme={getTimelineChartTheme(isDarkMode)}
              />
            </Chart>
          </ChartContainer>
        </ChartContainerWrapper>

        <ChartContainerWrapper>
          <ChartHeader title="Network" metrics={networkChartMetrics} />
          <ChartContainer>
            <Chart ref={networkChartRef}>
              <MetricExplorerSeriesChart
                type={MetricsExplorerChartType.line}
                metric={networkChartMetrics[0]}
                id="0"
                series={rxMetrics.timeseries!}
                stack={false}
              />
              <MetricExplorerSeriesChart
                type={MetricsExplorerChartType.line}
                metric={networkChartMetrics[1]}
                id="0"
                series={txMetrics.timeseries!}
                stack={false}
              />
              <Axis
                id={'timestamp'}
                position={Position.Bottom}
                showOverlappingTicks={true}
                tickFormat={formatter}
              />
              <Axis
                id={'values'}
                position={Position.Left}
                tickFormat={getFormatter('network')}
                domain={getDomain(networkTimeseries, networkChartMetrics)}
                ticks={6}
                showGridLines
              />
              <Settings
                onPointerUpdate={pointerUpdate}
                tooltip={tooltipProps}
                theme={getTimelineChartTheme(isDarkMode)}
              />
            </Chart>
          </ChartContainer>
        </ChartContainerWrapper>
      </ChartsContainer>
    </TabContent>
  );
};

const ChartsContainer = euiStyled.div`
  display: flex;
  flex-direction: row;
  flex-wrap: wrap;
`;

const ChartHeaderWrapper = euiStyled.div`
  display: flex;
  width: 100%;
  padding: ${(props) => props.theme.eui.paddingSizes.s} ${(props) =>
  props.theme.eui.paddingSizes.m};
`;

const ChartContainerWrapper = euiStyled.div`
  width: 50%
`;

const ChartContainer: React.FC = ({ children }) => (
  <div
    style={{
      width: '100%',
      height: 150,
    }}
  >
    {children}
  </div>
);

interface HeaderProps {
  title: string;
  metrics: MetricsExplorerOptionsMetric[];
}
const ChartHeader = ({ title, metrics }: HeaderProps) => {
  return (
    <ChartHeaderWrapper>
      <EuiFlexItem style={{ flex: 1 }} grow={true}>
        <EuiText>
          <strong>{title}</strong>
        </EuiText>
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <EuiFlexGroup gutterSize={'s'} alignItems={'center'}>
          {metrics.map((chartMetric) => (
            <EuiFlexGroup key={chartMetric.label!} gutterSize={'s'} alignItems={'center'}>
              <EuiFlexItem grow={false}>
                <EuiIcon color={colorTransformer(chartMetric.color!)} type={'dot'} />
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <EuiText size={'xs'}>{chartMetric.label}</EuiText>
              </EuiFlexItem>
            </EuiFlexGroup>
          ))}
        </EuiFlexGroup>
      </EuiFlexItem>
    </ChartHeaderWrapper>
  );
};

export const MetricsTab = {
  id: 'metrics',
  name: i18n.translate('xpack.infra.nodeDetails.tabs.metrics', {
    defaultMessage: 'Metrics',
  }),
  content: TabComponent,
};
