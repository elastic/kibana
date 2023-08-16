/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import type { XYLayerOptions } from '@kbn/lens-embeddable-utils';
import type { TypedLensByValueInput } from '@kbn/lens-plugin/public';
import { hostLensFormulas } from '../../../constants';
import type { XYChartLayerParams } from '../../../types';
import { REFERENCE_LINE, XY_OVERRIDES } from '../constants';

const XY_LAYER_OPTIONS: XYLayerOptions = {
  breakdown: {
    type: 'top_values',
    field: 'host.name',
    params: {
      size: 20,
    },
  },
};

export const hostsMetricCharts: Array<
  Pick<TypedLensByValueInput, 'id' | 'title' | 'overrides'> & {
    layers: XYChartLayerParams[];
  }
> = [
  {
    id: 'cpuUsage',
    title: i18n.translate('xpack.infra.hostsViewPage.tabs.metricsCharts.cpuUsage', {
      defaultMessage: 'CPU Usage',
    }),
    layers: [
      { data: [hostLensFormulas.cpuUsage], options: XY_LAYER_OPTIONS, type: 'visualization' },
    ],
    overrides: { axisLeft: XY_OVERRIDES.axisLeft },
  },
  {
    id: 'normalizedLoad1m',
    title: i18n.translate('xpack.infra.hostsViewPage.tabs.metricsCharts.normalizedLoad1m', {
      defaultMessage: 'Normalized Load',
    }),
    layers: [
      {
        data: [hostLensFormulas.normalizedLoad1m],
        options: XY_LAYER_OPTIONS,
        type: 'visualization',
      },
      {
        data: [REFERENCE_LINE],
        type: 'referenceLines',
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
        options: XY_LAYER_OPTIONS,
        type: 'visualization',
      },
    ],
    overrides: { axisLeft: XY_OVERRIDES.axisLeft },
  },
  {
    id: 'memoryFree',
    title: i18n.translate('xpack.infra.hostsViewPage.tabs.metricsCharts.memoryFree', {
      defaultMessage: 'Memory Free',
    }),
    layers: [
      {
        data: [hostLensFormulas.memoryFree],
        options: XY_LAYER_OPTIONS,
        type: 'visualization',
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
        options: XY_LAYER_OPTIONS,
        type: 'visualization',
      },
    ],
    overrides: { axisLeft: XY_OVERRIDES.axisLeft },
  },
  {
    id: 'diskSpaceAvailable',
    title: i18n.translate('xpack.infra.hostsViewPage.tabs.metricsCharts.diskSpaceAvailable', {
      defaultMessage: 'Disk Space Available',
    }),
    layers: [
      {
        data: [hostLensFormulas.diskSpaceAvailable],
        options: XY_LAYER_OPTIONS,
        type: 'visualization',
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
        options: XY_LAYER_OPTIONS,
        type: 'visualization',
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
        options: XY_LAYER_OPTIONS,
        type: 'visualization',
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
        options: XY_LAYER_OPTIONS,
        type: 'visualization',
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
        options: XY_LAYER_OPTIONS,
        type: 'visualization',
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
        options: XY_LAYER_OPTIONS,
        type: 'visualization',
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
        options: XY_LAYER_OPTIONS,
        type: 'visualization',
      },
    ],
  },
];
