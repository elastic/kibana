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

export const DataViewOrigin = {
  Logs: 'logs',
  Metrics: 'metrics',
} as const;
export type DataViewOrigin = typeof DataViewOrigin[keyof typeof DataViewOrigin];

const LayerParamsType = {
  Visualization: 'visualization',
  ReferenceLines: 'referenceLines',
} as const;

const cpuUsage = {
  id: 'cpuUsage',
  title: i18n.translate('xpack.infra.assetDetails.metricsCharts.cpuUsage', {
    defaultMessage: 'CPU Usage',
  }),

  layers: [
    {
      data: [hostLensFormulas.cpuUsage],
      type: LayerParamsType.Visualization,
    },
  ],
  dataViewOrigin: DataViewOrigin.Metrics,
  overrides: {
    axisLeft: XY_OVERRIDES.axisLeft,
  },
};
const cpuUsageBreakdown = {
  id: 'cpuUsageBreakdown',
  title: i18n.translate('xpack.infra.assetDetails.metricsCharts.cpuUsage', {
    defaultMessage: 'CPU Usage',
  }),
  layers: [
    {
      data: [
        hostLensFormulas.cpuUsageIowait,
        hostLensFormulas.cpuUsageIrq,
        hostLensFormulas.cpuUsageNice,
        hostLensFormulas.cpuUsageSoftirq,
        hostLensFormulas.cpuUsageSteal,
        hostLensFormulas.cpuUsageUser,
        hostLensFormulas.cpuUsageSystem,
      ],
      options: {
        seriesType: 'area_percentage_stacked' as const,
      },
      type: LayerParamsType.Visualization,
    },
  ],
  overrides: {
    axisLeft: XY_OVERRIDES.axisLeft,
    settings: XY_OVERRIDES.settings,
  },
  dataViewOrigin: DataViewOrigin.Metrics,
};
const memoryUsage = {
  id: 'memoryUsage',
  title: i18n.translate('xpack.infra.assetDetails.metricsCharts.memoryUsage', {
    defaultMessage: 'Memory Usage',
  }),
  layers: [
    {
      data: [hostLensFormulas.memoryUsage],
      type: LayerParamsType.Visualization,
    },
  ],
  dataViewOrigin: DataViewOrigin.Metrics,
  overrides: {
    axisLeft: XY_OVERRIDES.axisLeft,
  },
};
const normalizedLoad1m = {
  id: 'normalizedLoad1m',
  title: i18n.translate('xpack.infra.assetDetails.metricsCharts.normalizedLoad1m', {
    defaultMessage: 'Normalized Load',
  }),
  layers: [
    {
      data: [hostLensFormulas.normalizedLoad1m],
      type: LayerParamsType.Visualization,
    },
    {
      data: [REFERENCE_LINE],
      type: LayerParamsType.ReferenceLines,
    },
  ],
  dataViewOrigin: DataViewOrigin.Metrics,
};
const logRate = {
  id: 'logRate',
  title: i18n.translate('xpack.infra.assetDetails.metricsCharts.logRate', {
    defaultMessage: 'Log Rate',
  }),
  layers: [
    {
      data: [hostLensFormulas.logRate],
      type: LayerParamsType.Visualization,
    },
  ],
  dataViewOrigin: DataViewOrigin.Logs,
};

const diskSpaceUsageAvailable = {
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
        seriesType: 'area' as const,
      },
      type: LayerParamsType.Visualization,
    },
  ],
  overrides: {
    axisLeft: XY_OVERRIDES.axisLeft,
    settings: XY_OVERRIDES.settings,
  },
  dataViewOrigin: DataViewOrigin.Metrics,
};
const diskThroughputReadWrite = {
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
        seriesType: 'area' as const,
      },
      type: LayerParamsType.Visualization,
    },
  ],
  overrides: {
    settings: XY_OVERRIDES.settings,
  },
  dataViewOrigin: DataViewOrigin.Metrics,
};
const diskIOReadWrite = {
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
        seriesType: 'area' as const,
      },
      type: LayerParamsType.Visualization,
    },
  ],
  overrides: {
    settings: XY_OVERRIDES.settings,
  },
  dataViewOrigin: DataViewOrigin.Metrics,
};
const rxTx = {
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
        seriesType: 'area' as const,
      },
      type: LayerParamsType.Visualization,
    },
  ],
  overrides: {
    settings: XY_OVERRIDES.settings,
  },
  dataViewOrigin: DataViewOrigin.Metrics,
};

export const hostMetricCharts: Array<
  Pick<TypedLensByValueInput, 'id' | 'title' | 'overrides'> & {
    dataViewOrigin: DataViewOrigin;
    layers: XYChartLayerParams[];
  }
> = [
  cpuUsage,
  memoryUsage,
  normalizedLoad1m,
  logRate,
  diskSpaceUsageAvailable,
  diskThroughputReadWrite,
  diskIOReadWrite,
  rxTx,
];

export const hostMetricChartsFullPage: Array<
  Pick<TypedLensByValueInput, 'id' | 'title' | 'overrides'> & {
    dataViewOrigin: DataViewOrigin;
    layers: XYChartLayerParams[];
  }
> = [
  cpuUsage,
  cpuUsageBreakdown,
  memoryUsage,
  normalizedLoad1m,
  logRate,
  diskSpaceUsageAvailable,
  diskThroughputReadWrite,
  diskIOReadWrite,
  rxTx,
];
