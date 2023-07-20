/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';

import { EuiFlexGrid, EuiFlexItem } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { EuiSpacer } from '@elastic/eui';
import { hostLensFormulas, type XYLayerOptions } from '../../../../../../common/visualizations';
import { HostMetricsDocsLink } from '../../../../../../components/lens';
import { MetricChart, MetricChartProps } from './metric_chart';

const DEFAULT_BREAKDOWN_SIZE = 20;
const XY_LAYER_OPTIONS: XYLayerOptions = {
  breakdown: {
    size: DEFAULT_BREAKDOWN_SIZE,
    sourceField: 'host.name',
  },
};

const PERCENT_LEFT_AXIS: Pick<MetricChartProps, 'overrides'>['overrides'] = {
  axisLeft: {
    domain: {
      min: 0,
      max: 1,
    },
  },
};

const CHARTS_IN_ORDER: MetricChartProps[] = [
  {
    id: 'cpuUsage',
    title: i18n.translate('xpack.infra.hostsViewPage.tabs.metricsCharts.cpuUsage', {
      defaultMessage: 'CPU Usage',
    }),
    layers: [
      {
        data: [hostLensFormulas.cpuUsage],
        layerType: 'data',
        options: XY_LAYER_OPTIONS,
      },
    ],
    overrides: PERCENT_LEFT_AXIS,
  },
  {
    id: 'normalizedLoad1m',
    title: i18n.translate('xpack.infra.hostsViewPage.tabs.metricsCharts.normalizedLoad1m', {
      defaultMessage: 'Normalized Load',
    }),
    layers: [
      {
        data: [hostLensFormulas.normalizedLoad1m],
        layerType: 'data',
        options: XY_LAYER_OPTIONS,
      },
      {
        data: [
          {
            value: '1',
            format: {
              id: 'percent',
              params: {
                decimals: 0,
              },
            },
            color: '#6092c0',
          },
        ],
        layerType: 'referenceLine',
      },
    ],
  },
  {
    id: 'memoryUsage',
    title: i18n.translate('xpack.infra.hostsViewPage.tabs.metricsCharts.memoryUsage', {
      defaultMessage: 'Memory Usage',
    }),
    layers: [
      {
        data: [hostLensFormulas.memoryUsage],
        layerType: 'data',
        options: XY_LAYER_OPTIONS,
      },
    ],
    overrides: PERCENT_LEFT_AXIS,
  },
  {
    id: 'memoryFree',
    title: i18n.translate('xpack.infra.hostsViewPage.tabs.metricsCharts.memoryFree', {
      defaultMessage: 'Memory Free',
    }),
    layers: [
      {
        data: [hostLensFormulas.memoryFree],
        layerType: 'data',
        options: XY_LAYER_OPTIONS,
      },
    ],
  },
  {
    id: 'diskSpaceUsed',
    title: i18n.translate('xpack.infra.hostsViewPage.tabs.metricsCharts.diskSpaceUsed', {
      defaultMessage: 'Disk Space Usage',
    }),
    layers: [
      {
        data: [hostLensFormulas.diskSpaceUsage],
        layerType: 'data',
        options: XY_LAYER_OPTIONS,
      },
    ],
    overrides: PERCENT_LEFT_AXIS,
  },
  {
    id: 'diskSpaceAvailable',
    title: i18n.translate('xpack.infra.hostsViewPage.tabs.metricsCharts.diskSpaceAvailable', {
      defaultMessage: 'Disk Space Available',
    }),
    layers: [
      {
        data: [hostLensFormulas.diskSpaceAvailable],
        layerType: 'data',
        options: XY_LAYER_OPTIONS,
      },
    ],
  },
  {
    id: 'diskIORead',
    title: i18n.translate('xpack.infra.hostsViewPage.tabs.metricsCharts.diskIORead', {
      defaultMessage: 'Disk Read IOPS',
    }),
    layers: [
      {
        data: [hostLensFormulas.diskIORead],
        layerType: 'data',
        options: XY_LAYER_OPTIONS,
      },
    ],
  },
  {
    id: 'diskIOWrite',
    title: i18n.translate('xpack.infra.hostsViewPage.tabs.metricsCharts.diskIOWrite', {
      defaultMessage: 'Disk Write IOPS',
    }),
    layers: [
      {
        data: [hostLensFormulas.diskIOWrite],
        layerType: 'data',
        options: XY_LAYER_OPTIONS,
      },
    ],
  },
  {
    id: 'diskReadThroughput',
    title: i18n.translate('xpack.infra.hostsViewPage.tabs.metricsCharts.diskReadThroughput', {
      defaultMessage: 'Disk Read Throughput',
    }),
    layers: [
      {
        data: [hostLensFormulas.diskReadThroughput],
        layerType: 'data',
        options: XY_LAYER_OPTIONS,
      },
    ],
  },
  {
    id: 'diskWriteThroughput',
    title: i18n.translate('xpack.infra.hostsViewPage.tabs.metricsCharts.diskWriteThroughput', {
      defaultMessage: 'Disk Write Throughput',
    }),
    layers: [
      {
        data: [hostLensFormulas.diskWriteThroughput],
        layerType: 'data',
        options: XY_LAYER_OPTIONS,
      },
    ],
  },
  {
    id: 'rx',
    title: i18n.translate('xpack.infra.hostsViewPage.tabs.metricsCharts.rx', {
      defaultMessage: 'Network Inbound (RX)',
    }),
    layers: [
      {
        data: [hostLensFormulas.rx],
        layerType: 'data',
        options: XY_LAYER_OPTIONS,
      },
    ],
  },
  {
    id: 'tx',
    title: i18n.translate('xpack.infra.hostsViewPage.tabs.metricsCharts.tx', {
      defaultMessage: 'Network Outbound (TX)',
    }),
    layers: [
      {
        data: [hostLensFormulas.tx],
        layerType: 'data',
        options: XY_LAYER_OPTIONS,
      },
    ],
  },
];

export const MetricsGrid = React.memo(() => {
  return (
    <>
      <HostMetricsDocsLink />
      <EuiSpacer size="s" />
      <EuiFlexGrid columns={2} gutterSize="s" data-test-subj="hostsView-metricChart">
        {CHARTS_IN_ORDER.map((chartProp, index) => (
          <EuiFlexItem key={index} grow={false}>
            <MetricChart {...chartProp} />
          </EuiFlexItem>
        ))}
      </EuiFlexGrid>
    </>
  );
});
