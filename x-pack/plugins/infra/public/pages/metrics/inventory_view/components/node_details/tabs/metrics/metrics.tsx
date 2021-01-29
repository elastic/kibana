/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { first, last } from 'lodash';
import { i18n } from '@kbn/i18n';
import {
  Axis,
  Chart,
  ChartSizeArray,
  niceTimeFormatter,
  Position,
  Settings,
  TooltipValue,
  PointerEvent,
} from '@elastic/charts';
import moment from 'moment';
import { EuiLoadingChart, EuiSpacer, EuiFlexGrid, EuiFlexItem } from '@elastic/eui';
import { TabContent, TabProps } from '../shared';
import { useSnapshot } from '../../../../hooks/use_snaphot';
import { useWaffleOptionsContext } from '../../../../hooks/use_waffle_options';
import { useSourceContext } from '../../../../../../../containers/source';
import { findInventoryFields } from '../../../../../../../../common/inventory_models';
import { convertKueryToElasticSearchQuery } from '../../../../../../../utils/kuery';
import { SnapshotMetricType } from '../../../../../../../../common/inventory_models/types';
import {
  MetricsExplorerChartType,
  MetricsExplorerOptionsMetric,
} from '../../../../../metrics_explorer/hooks/use_metrics_explorer_options';
import { Color } from '../../../../../../../../common/color_palette';
import {
  MetricsExplorerAggregation,
  MetricsExplorerSeries,
} from '../../../../../../../../common/http_api';
import { MetricExplorerSeriesChart } from '../../../../../metrics_explorer/components/series_chart';
import { createInventoryMetricFormatter } from '../../../../lib/create_inventory_metric_formatter';
import { calculateDomain } from '../../../../../metrics_explorer/components/helpers/calculate_domain';
import { getTimelineChartTheme } from '../../../../../metrics_explorer/components/helpers/get_chart_theme';
import { useUiSetting } from '../../../../../../../../../../../src/plugins/kibana_react/public';
import { ChartHeader } from './chart_header';
import {
  SYSTEM_METRIC_NAME,
  USER_METRIC_NAME,
  INBOUND_METRIC_NAME,
  OUTBOUND_METRIC_NAME,
  USED_MEMORY_METRIC_NAME,
  FREE_MEMORY_METRIC_NAME,
  CPU_CHART_TITLE,
  LOAD_CHART_TITLE,
  MEMORY_CHART_TITLE,
  NETWORK_CHART_TITLE,
} from './translations';
import { TimeDropdown } from './time_dropdown';

const ONE_HOUR = 60 * 60 * 1000;
const CHART_SIZE: ChartSizeArray = ['100%', 160];

const TabComponent = (props: TabProps) => {
  const cpuChartRef = useRef<Chart>(null);
  const networkChartRef = useRef<Chart>(null);
  const memoryChartRef = useRef<Chart>(null);
  const loadChartRef = useRef<Chart>(null);
  const [time, setTime] = useState(ONE_HOUR);
  const chartRefs = useMemo(() => [cpuChartRef, networkChartRef, memoryChartRef, loadChartRef], [
    cpuChartRef,
    networkChartRef,
    memoryChartRef,
    loadChartRef,
  ]);
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

  const buildCustomMetric = useCallback(
    (field: string, id: string, aggregation: string = 'avg') => ({
      type: 'custom' as SnapshotMetricType,
      aggregation,
      field,
      id,
    }),
    []
  );

  const updateTime = useCallback(
    (e: React.ChangeEvent<HTMLSelectElement>) => {
      setTime(Number(e.currentTarget.value));
    },
    [setTime]
  );

  const { nodes, reload } = useSnapshot(
    filter,
    [
      { type: 'rx' },
      { type: 'tx' },
      buildCustomMetric('system.cpu.user.pct', 'user'),
      buildCustomMetric('system.cpu.system.pct', 'system'),
      buildCustomMetric('system.load.1', 'load1m'),
      buildCustomMetric('system.load.5', 'load5m'),
      buildCustomMetric('system.load.15', 'load15m'),
      buildCustomMetric('system.memory.actual.used.bytes', 'usedMemory'),
      buildCustomMetric('system.memory.actual.free', 'freeMemory'),
      buildCustomMetric('system.cpu.cores', 'cores', 'max'),
    ],
    [],
    nodeType,
    sourceId,
    currentTime,
    accountId,
    region,
    false,
    {
      interval: '1m',
      to: currentTime,
      from: currentTime - time,
      ignoreLookback: true,
    }
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

  const networkFormatter = useMemo(() => createInventoryMetricFormatter({ type: 'rx' }), []);
  const cpuFormatter = useMemo(() => createInventoryMetricFormatter({ type: 'cpu' }), []);
  const memoryFormatter = useMemo(
    () => createInventoryMetricFormatter({ type: 's3BucketSize' }),
    []
  );
  const loadFormatter = useMemo(() => createInventoryMetricFormatter({ type: 'load' }), []);

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

  const buildChartMetricLabels = useCallback(
    (labels: string[], aggregation: MetricsExplorerAggregation) => {
      const baseMetric = {
        color: Color.color0,
        aggregation,
        label: 'System',
      };

      return labels.map((label, idx) => {
        return { ...baseMetric, color: Color[`color${idx}` as Color], label };
      });
    },
    []
  );

  const pointerUpdate = useCallback(
    (event: PointerEvent) => {
      chartRefs.forEach((ref) => {
        if (ref.current) {
          ref.current.dispatchExternalPointerEvent(event);
        }
      });
    },
    [chartRefs]
  );

  const isDarkMode = useUiSetting<boolean>('theme:darkMode');
  const tooltipProps = {
    headerFormatter: (tooltipValue: TooltipValue) =>
      moment(tooltipValue.value).format('Y-MM-DD HH:mm:ss.SSS'),
  };

  const getTimeseries = useCallback(
    (metricName: string) => {
      if (!nodes || !nodes.length) {
        return null;
      }
      return nodes[0].metrics.find((m) => m.name === metricName)!.timeseries!;
    },
    [nodes]
  );

  const systemMetricsTs = useMemo(() => getTimeseries('system'), [getTimeseries]);
  const userMetricsTs = useMemo(() => getTimeseries('user'), [getTimeseries]);
  const rxMetricsTs = useMemo(() => getTimeseries('rx'), [getTimeseries]);
  const txMetricsTs = useMemo(() => getTimeseries('tx'), [getTimeseries]);
  const load1mMetricsTs = useMemo(() => getTimeseries('load1m'), [getTimeseries]);
  const load5mMetricsTs = useMemo(() => getTimeseries('load5m'), [getTimeseries]);
  const load15mMetricsTs = useMemo(() => getTimeseries('load15m'), [getTimeseries]);
  const usedMemoryMetricsTs = useMemo(() => getTimeseries('usedMemory'), [getTimeseries]);
  const freeMemoryMetricsTs = useMemo(() => getTimeseries('freeMemory'), [getTimeseries]);
  const coresMetricsTs = useMemo(() => getTimeseries('cores'), [getTimeseries]);

  useEffect(() => {
    reload();
  }, [time, reload]);

  if (
    !systemMetricsTs ||
    !userMetricsTs ||
    !rxMetricsTs ||
    !txMetricsTs ||
    !load1mMetricsTs ||
    !load5mMetricsTs ||
    !load15mMetricsTs ||
    !usedMemoryMetricsTs ||
    !freeMemoryMetricsTs
  ) {
    return <LoadingPlaceholder />;
  }

  const cpuChartMetrics = buildChartMetricLabels([SYSTEM_METRIC_NAME, USER_METRIC_NAME], 'avg');
  const networkChartMetrics = buildChartMetricLabels(
    [INBOUND_METRIC_NAME, OUTBOUND_METRIC_NAME],
    'rate'
  );
  const loadChartMetrics = buildChartMetricLabels(['1m', '5m', '15m'], 'avg');
  const memoryChartMetrics = buildChartMetricLabels(
    [USED_MEMORY_METRIC_NAME, FREE_MEMORY_METRIC_NAME],
    'rate'
  );

  systemMetricsTs.rows = systemMetricsTs.rows.slice().map((r, idx) => {
    const metric = r.metric_0 as number | undefined;
    const cores = coresMetricsTs!.rows[idx].metric_0 as number | undefined;
    if (metric && cores) {
      r.metric_0 = metric / cores;
    }
    return r;
  });

  userMetricsTs.rows = userMetricsTs.rows.slice().map((r, idx) => {
    const metric = r.metric_0 as number | undefined;
    const cores = coresMetricsTs!.rows[idx].metric_0 as number | undefined;
    if (metric && cores) {
      r.metric_0 = metric / cores;
    }
    return r;
  });
  const cpuTimeseries = mergeTimeseries(systemMetricsTs, userMetricsTs);
  const networkTimeseries = mergeTimeseries(rxMetricsTs, txMetricsTs);
  const loadTimeseries = mergeTimeseries(load1mMetricsTs, load5mMetricsTs, load15mMetricsTs);
  const memoryTimeseries = mergeTimeseries(usedMemoryMetricsTs, freeMemoryMetricsTs);

  const formatter = dateFormatter(rxMetricsTs);

  return (
    <TabContent>
      <TimeDropdown value={time} onChange={updateTime} />

      <EuiSpacer size={'l'} />

      <EuiFlexGrid columns={2} gutterSize={'l'} responsive={false}>
        <EuiFlexItem>
          <ChartHeader title={CPU_CHART_TITLE} metrics={cpuChartMetrics} />
          <Chart ref={cpuChartRef} size={CHART_SIZE}>
            <MetricExplorerSeriesChart
              type={MetricsExplorerChartType.line}
              metric={cpuChartMetrics[0]}
              id={'0'}
              series={systemMetricsTs!}
              stack={false}
            />
            <MetricExplorerSeriesChart
              type={MetricsExplorerChartType.line}
              metric={cpuChartMetrics[1]}
              id={'0'}
              series={userMetricsTs}
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
              tickFormat={cpuFormatter}
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
        </EuiFlexItem>

        <EuiFlexItem>
          <ChartHeader title={LOAD_CHART_TITLE} metrics={loadChartMetrics} />
          <Chart ref={loadChartRef} size={CHART_SIZE}>
            <MetricExplorerSeriesChart
              type={MetricsExplorerChartType.line}
              metric={loadChartMetrics[0]}
              id="0"
              series={load1mMetricsTs}
              stack={false}
            />
            <MetricExplorerSeriesChart
              type={MetricsExplorerChartType.line}
              metric={loadChartMetrics[1]}
              id="0"
              series={load5mMetricsTs}
              stack={false}
            />
            <MetricExplorerSeriesChart
              type={MetricsExplorerChartType.line}
              metric={loadChartMetrics[2]}
              id="0"
              series={load15mMetricsTs}
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
              tickFormat={loadFormatter}
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
        </EuiFlexItem>

        <EuiFlexItem>
          <ChartHeader title={MEMORY_CHART_TITLE} metrics={memoryChartMetrics} />
          <Chart ref={memoryChartRef} size={CHART_SIZE}>
            <MetricExplorerSeriesChart
              type={MetricsExplorerChartType.line}
              metric={memoryChartMetrics[0]}
              id="0"
              series={usedMemoryMetricsTs}
              stack={false}
            />
            <MetricExplorerSeriesChart
              type={MetricsExplorerChartType.line}
              metric={memoryChartMetrics[1]}
              id="0"
              series={freeMemoryMetricsTs}
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
              tickFormat={memoryFormatter}
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
        </EuiFlexItem>

        <EuiFlexItem>
          <ChartHeader title={NETWORK_CHART_TITLE} metrics={networkChartMetrics} />
          <Chart ref={networkChartRef} size={CHART_SIZE}>
            <MetricExplorerSeriesChart
              type={MetricsExplorerChartType.line}
              metric={networkChartMetrics[0]}
              id="0"
              series={rxMetricsTs}
              stack={false}
            />
            <MetricExplorerSeriesChart
              type={MetricsExplorerChartType.line}
              metric={networkChartMetrics[1]}
              id="0"
              series={txMetricsTs}
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
              tickFormat={networkFormatter}
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
        </EuiFlexItem>
      </EuiFlexGrid>
    </TabContent>
  );
};

const LoadingPlaceholder = () => {
  return (
    <div
      style={{
        width: '100%',
        height: '200px',
        padding: '16px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <EuiLoadingChart size="xl" />
    </div>
  );
};

export const MetricsTab = {
  id: 'metrics',
  name: i18n.translate('xpack.infra.nodeDetails.tabs.metrics', {
    defaultMessage: 'Metrics',
  }),
  content: TabComponent,
};
