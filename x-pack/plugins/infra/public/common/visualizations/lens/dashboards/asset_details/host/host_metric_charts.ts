/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import type { TypedLensByValueInput } from '@kbn/lens-plugin/public';
import { hostLensFormulas } from '../../../../constants';
import type { XYChartLayerParams } from '../../../../types';
import { REFERENCE_LINE, XY_OVERRIDES } from '../../constants';

type DataViewOrigin = 'logs' | 'metrics';

export const hostMetricCharts: Array<
  Pick<TypedLensByValueInput, 'id' | 'title' | 'overrides'> & {
    dataViewOrigin: DataViewOrigin;
    layers: XYChartLayerParams[];
  }
> = [
  {
    id: 'cpuUsage',
    title: i18n.translate('xpack.infra.assetDetails.metricsCharts.cpuUsage', {
      defaultMessage: 'CPU Usage',
    }),

    layers: [
      {
        data: [hostLensFormulas.cpuUsage],
        type: 'visualization',
      },
    ],
    dataViewOrigin: 'metrics',
    overrides: {
      axisLeft: XY_OVERRIDES.axisLeft,
    },
  },
  {
    id: 'memoryUsage',
    title: i18n.translate('xpack.infra.assetDetails.metricsCharts.memoryUsage', {
      defaultMessage: 'Memory Usage',
    }),
    layers: [
      {
        data: [hostLensFormulas.memoryUsage],
        type: 'visualization',
      },
    ],
    dataViewOrigin: 'metrics',
    overrides: {
      axisLeft: XY_OVERRIDES.axisLeft,
    },
  },
  {
    id: 'normalizedLoad1m',
    title: i18n.translate('xpack.infra.assetDetails.metricsCharts.normalizedLoad1m', {
      defaultMessage: 'Normalized Load',
    }),
    layers: [
      {
        data: [hostLensFormulas.normalizedLoad1m],
        type: 'visualization',
      },
      {
        data: [REFERENCE_LINE],
        type: 'referenceLines',
      },
    ],
    dataViewOrigin: 'metrics',
  },
  {
    id: 'logRate',
    title: i18n.translate('xpack.infra.assetDetails.metricsCharts.logRate', {
      defaultMessage: 'Log Rate',
    }),
    layers: [
      {
        data: [hostLensFormulas.logRate],
        type: 'visualization',
      },
    ],
    dataViewOrigin: 'logs',
  },
  {
    id: 'diskSpaceUsageAvailable',
    title: i18n.translate('xpack.infra.assetDetails.metricsCharts.diskSpace', {
      defaultMessage: 'Disk Space',
    }),
    layers: [
      {
        data: [
          {
            ...hostLensFormulas.diskSpaceUsage,
            label: i18n.translate('xpack.infra.assetDetails.metricsCharts.diskSpace.label.used', {
              defaultMessage: 'Used',
            }),
          },
          {
            ...hostLensFormulas.diskSpaceAvailability,
            label: i18n.translate(
              'xpack.infra.assetDetails.metricsCharts.diskSpace.label.available',
              {
                defaultMessage: 'Available',
              }
            ),
          },
        ],
        options: {
          seriesType: 'area',
        },
        type: 'visualization',
      },
    ],
    overrides: {
      axisLeft: XY_OVERRIDES.axisLeft,
      settings: XY_OVERRIDES.settings,
    },
    dataViewOrigin: 'metrics',
  },
  {
    id: 'diskThroughputReadWrite',
    title: i18n.translate('xpack.infra.assetDetails.metricsCharts.diskIOPS', {
      defaultMessage: 'Disk IOPS',
    }),
    layers: [
      {
        data: [
          {
            ...hostLensFormulas.diskIORead,
            label: i18n.translate('xpack.infra.assetDetails.metricsCharts.metric.label.read', {
              defaultMessage: 'Read',
            }),
          },
          {
            ...hostLensFormulas.diskIOWrite,
            label: i18n.translate('xpack.infra.assetDetails.metricsCharts.metric.label.write', {
              defaultMessage: 'Write',
            }),
          },
        ],
        options: {
          seriesType: 'area',
        },
        type: 'visualization',
      },
    ],
    overrides: {
      settings: XY_OVERRIDES.settings,
    },
    dataViewOrigin: 'metrics',
  },
  {
    id: 'diskIOReadWrite',
    title: i18n.translate('xpack.infra.assetDetails.metricsCharts.diskThroughput', {
      defaultMessage: 'Disk Throughput',
    }),
    layers: [
      {
        data: [
          {
            ...hostLensFormulas.diskReadThroughput,
            label: i18n.translate('xpack.infra.assetDetails.metricsCharts.metric.label.read', {
              defaultMessage: 'Read',
            }),
          },
          {
            ...hostLensFormulas.diskWriteThroughput,
            label: i18n.translate('xpack.infra.assetDetails.metricsCharts.metric.label.write', {
              defaultMessage: 'Write',
            }),
          },
        ],
        options: {
          seriesType: 'area',
        },
        type: 'visualization',
      },
    ],
    overrides: {
      settings: XY_OVERRIDES.settings,
    },
    dataViewOrigin: 'metrics',
  },
  {
    id: 'rxTx',
    title: i18n.translate('xpack.infra.assetDetails.metricsCharts.network', {
      defaultMessage: 'Network',
    }),
    layers: [
      {
        data: [
          {
            ...hostLensFormulas.rx,
            label: i18n.translate('xpack.infra.assetDetails.metricsCharts.network.label.rx', {
              defaultMessage: 'Inbound (RX)',
            }),
          },
          {
            ...hostLensFormulas.tx,
            label: i18n.translate('xpack.infra.assetDetails.metricsCharts.network.label.tx', {
              defaultMessage: 'Outbound (TX)',
            }),
          },
        ],
        options: {
          seriesType: 'area',
        },
        type: 'visualization',
      },
    ],
    overrides: {
      settings: XY_OVERRIDES.settings,
    },
    dataViewOrigin: 'metrics',
  },
];
