/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { i18n } from '@kbn/i18n';
import { Chart, niceTimeFormatter, PointerEvent } from '@elastic/charts';
import { EuiLoadingChart, EuiSpacer, EuiFlexGrid, EuiFlexItem } from '@elastic/eui';
import { first, last } from 'lodash';
import { TabContent, TabProps } from '../shared';
import { useSnapshot } from '../../../../hooks/use_snaphot';
import { useWaffleOptionsContext } from '../../../../hooks/use_waffle_options';
import { useSourceContext } from '../../../../../../../containers/metrics_source';
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
import { createInventoryMetricFormatter } from '../../../../lib/create_inventory_metric_formatter';
import { calculateDomain } from '../../../../../metrics_explorer/components/helpers/calculate_domain';
import { euiStyled } from '../../../../../../../../../../../src/plugins/kibana_react/common';
import { ChartSection } from './chart_section';
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
  LOG_RATE_METRIC_NAME,
  LOG_RATE_CHART_TITLE,
} from './translations';
import { TimeDropdown } from './time_dropdown';
import { getCustomMetricLabel } from '../../../../../../../../common/formatters/get_custom_metric_label';
import { createFormatterForMetric } from '../../../../../metrics_explorer/components/helpers/create_formatter_for_metric';

const ONE_HOUR = 60 * 60 * 1000;

const TabComponent = (props: TabProps) => {
  const cpuChartRef = useRef<Chart>(null);
  const networkChartRef = useRef<Chart>(null);
  const memoryChartRef = useRef<Chart>(null);
  const loadChartRef = useRef<Chart>(null);
  const logRateChartRef = useRef<Chart>(null);
  const customMetricRefs = useRef<Record<string, Chart | null>>({});
  const [time, setTime] = useState(ONE_HOUR);
  const chartRefs = useMemo(() => {
    const refs = [cpuChartRef, networkChartRef, memoryChartRef, loadChartRef, logRateChartRef];
    return [...refs, customMetricRefs];
  }, [
    cpuChartRef,
    networkChartRef,
    memoryChartRef,
    loadChartRef,
    logRateChartRef,
    customMetricRefs,
  ]);
  const { sourceId, createDerivedIndexPattern } = useSourceContext();
  const { nodeType, accountId, region, customMetrics } = useWaffleOptionsContext();
  const { currentTime, node } = props;
  const derivedIndexPattern = useMemo(
    () => createDerivedIndexPattern(),
    [createDerivedIndexPattern]
  );
  let filter = `${findInventoryFields(nodeType).id}: "${node.id}"`;

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

  const timeRange = {
    interval: '1m',
    to: currentTime,
    from: currentTime - time,
    ignoreLookback: true,
  };

  const defaultMetrics: Array<{ type: SnapshotMetricType }> = [
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
  ];

  const { nodes, reload } = useSnapshot(
    filter,
    [...defaultMetrics, ...customMetrics],
    [],
    nodeType,
    sourceId,
    currentTime,
    accountId,
    region,
    false,
    timeRange
  );

  const { nodes: logRateNodes, reload: reloadLogRate } = useSnapshot(
    filter,
    [{ type: 'logRate' }],
    [],
    nodeType,
    sourceId,
    currentTime,
    accountId,
    region,
    false,
    timeRange
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
  const logRateFormatter = useMemo(() => createInventoryMetricFormatter({ type: 'logRate' }), []);

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
          if (ref.current instanceof Chart) {
            ref.current.dispatchExternalPointerEvent(event);
          } else {
            const charts = Object.values(ref.current);
            charts.forEach((c) => {
              if (c) {
                c.dispatchExternalPointerEvent(event);
              }
            });
          }
        }
      });
    },
    [chartRefs]
  );

  const getTimeseries = useCallback(
    (metricName: string) => {
      if (!nodes || !nodes.length) {
        return null;
      }
      return nodes[0].metrics.find((m) => m.name === metricName)!.timeseries!;
    },
    [nodes]
  );

  const getLogRateTimeseries = useCallback(() => {
    if (!logRateNodes) {
      return null;
    }
    if (logRateNodes.length === 0) {
      return { rows: [], columns: [], id: '0' };
    }
    return logRateNodes[0].metrics.find((m) => m.name === 'logRate')!.timeseries!;
  }, [logRateNodes]);

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
  const logRateMetricsTs = useMemo(() => getLogRateTimeseries(), [getLogRateTimeseries]);

  useEffect(() => {
    reload();
    reloadLogRate();
  }, [time, reload, reloadLogRate]);

  if (
    !systemMetricsTs ||
    !userMetricsTs ||
    !rxMetricsTs ||
    !txMetricsTs ||
    !load1mMetricsTs ||
    !load5mMetricsTs ||
    !load15mMetricsTs ||
    !usedMemoryMetricsTs ||
    !freeMemoryMetricsTs ||
    !logRateMetricsTs
  ) {
    return <LoadingPlaceholder />;
  }

  const cpuChartMetrics = buildChartMetricLabels([SYSTEM_METRIC_NAME, USER_METRIC_NAME], 'avg');
  const logRateChartMetrics = buildChartMetricLabels([LOG_RATE_METRIC_NAME], 'rate');
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
  const logRateTimeseries = mergeTimeseries(logRateMetricsTs);
  const networkTimeseries = mergeTimeseries(rxMetricsTs, txMetricsTs);
  const loadTimeseries = mergeTimeseries(load1mMetricsTs, load5mMetricsTs, load15mMetricsTs);
  const memoryTimeseries = mergeTimeseries(usedMemoryMetricsTs, freeMemoryMetricsTs);

  const formatter = dateFormatter(rxMetricsTs);

  return (
    <TabContent>
      <TimeDropdown value={time} onChange={updateTime} />

      <EuiSpacer size={'l'} />

      <EuiFlexGrid columns={2} gutterSize={'l'} responsive={false}>
        <ChartGridItem>
          <ChartSection
            title={CPU_CHART_TITLE}
            style={MetricsExplorerChartType.line}
            chartRef={cpuChartRef}
            series={[
              { metric: cpuChartMetrics[0], series: systemMetricsTs },
              { metric: cpuChartMetrics[1], series: userMetricsTs },
            ]}
            tickFormatterForTime={formatter}
            tickFormatter={cpuFormatter}
            onPointerUpdate={pointerUpdate}
            domain={getDomain(cpuTimeseries, cpuChartMetrics)}
          />
        </ChartGridItem>

        <ChartGridItem>
          <ChartSection
            title={LOAD_CHART_TITLE}
            style={MetricsExplorerChartType.line}
            chartRef={loadChartRef}
            series={[
              { metric: loadChartMetrics[0], series: load1mMetricsTs },
              { metric: loadChartMetrics[1], series: load5mMetricsTs },
              { metric: loadChartMetrics[2], series: load15mMetricsTs },
            ]}
            tickFormatterForTime={formatter}
            tickFormatter={loadFormatter}
            onPointerUpdate={pointerUpdate}
            domain={getDomain(loadTimeseries, loadChartMetrics)}
          />
        </ChartGridItem>

        <ChartGridItem>
          <ChartSection
            title={MEMORY_CHART_TITLE}
            style={MetricsExplorerChartType.line}
            chartRef={memoryChartRef}
            series={[
              { metric: memoryChartMetrics[0], series: usedMemoryMetricsTs },
              { metric: memoryChartMetrics[1], series: freeMemoryMetricsTs },
            ]}
            tickFormatterForTime={formatter}
            tickFormatter={memoryFormatter}
            onPointerUpdate={pointerUpdate}
            domain={getDomain(memoryTimeseries, memoryChartMetrics)}
          />
        </ChartGridItem>

        <ChartGridItem>
          <ChartSection
            title={NETWORK_CHART_TITLE}
            style={MetricsExplorerChartType.line}
            chartRef={networkChartRef}
            series={[
              { metric: networkChartMetrics[0], series: rxMetricsTs },
              { metric: networkChartMetrics[1], series: txMetricsTs },
            ]}
            tickFormatterForTime={formatter}
            tickFormatter={networkFormatter}
            onPointerUpdate={pointerUpdate}
            domain={getDomain(networkTimeseries, networkChartMetrics)}
            stack={true}
          />
        </ChartGridItem>

        <ChartGridItem>
          <ChartSection
            title={LOG_RATE_CHART_TITLE}
            style={MetricsExplorerChartType.line}
            chartRef={logRateChartRef}
            series={[{ metric: logRateChartMetrics[0], series: logRateMetricsTs }]}
            tickFormatterForTime={formatter}
            tickFormatter={logRateFormatter}
            onPointerUpdate={pointerUpdate}
            domain={getDomain(logRateTimeseries, logRateChartMetrics)}
            stack={true}
          />
        </ChartGridItem>

        {customMetrics.map((c) => {
          const metricTS = getTimeseries(c.id);
          const chartMetrics = buildChartMetricLabels([c.field], c.aggregation);
          if (!metricTS) return null;
          return (
            <ChartGridItem>
              <ChartSection
                title={getCustomMetricLabel(c)}
                style={MetricsExplorerChartType.line}
                chartRef={(r) => {
                  customMetricRefs.current[c.id] = r;
                }}
                series={[{ metric: chartMetrics[0], series: metricTS }]}
                tickFormatterForTime={formatter}
                tickFormatter={createFormatterForMetric(c)}
                onPointerUpdate={pointerUpdate}
                domain={getDomain(mergeTimeseries(metricTS), chartMetrics)}
                stack={true}
              />
            </ChartGridItem>
          );
        })}
      </EuiFlexGrid>
    </TabContent>
  );
};

const ChartGridItem = euiStyled(EuiFlexItem)`
  overflow: hidden
`;

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
