/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import type { TypedLensByValueInput } from '@kbn/lens-plugin/public';
import type { DataViewOrigin } from '../../../../../../components/asset_details/types';
import { hostLensFormulas } from '../../../../constants';
import type { XYChartLayerParams } from '../../../../types';
import { REFERENCE_LINE, XY_OVERRIDES } from '../../constants';

const TOP_VALUES_TYPE = 'top_values';

type XYConfig = Pick<TypedLensByValueInput, 'id' | 'title' | 'overrides'> & {
  dataViewOrigin: DataViewOrigin;
  layers: XYChartLayerParams[];
};

const cpuUsage: XYConfig = {
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
};

const cpuUsageBreakdown: XYConfig = {
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
        seriesType: 'area_percentage_stacked',
      },
      type: 'visualization',
    },
  ],
  overrides: {
    axisLeft: XY_OVERRIDES.axisLeft,
    settings: XY_OVERRIDES.settings,
  },
  dataViewOrigin: 'metrics',
};

const memoryUsage: XYConfig = {
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
};

const memoryUsageBreakdown: XYConfig = {
  id: 'memoryUsage',
  title: i18n.translate('xpack.infra.assetDetails.metricsCharts.memoryUsage', {
    defaultMessage: 'Memory Usage',
  }),
  layers: [
    {
      data: [
        {
          ...hostLensFormulas.memoryCache,
          label: i18n.translate('xpack.infra.assetDetails.metricsCharts.metric.label.cache', {
            defaultMessage: 'Cache',
          }),
        },
        {
          ...hostLensFormulas.memoryUsed,
          label: i18n.translate('xpack.infra.assetDetails.metricsCharts.metric.label.used', {
            defaultMessage: 'Used',
          }),
        },
        {
          ...hostLensFormulas.memoryFreeExcludingCache,
          label: i18n.translate('xpack.infra.assetDetails.metricsCharts.metric.label.free', {
            defaultMessage: 'Free',
          }),
        },
      ],
      options: {
        seriesType: 'area_stacked',
      },
      type: 'visualization',
    },
  ],
  overrides: {
    settings: XY_OVERRIDES.settings,
  },
  dataViewOrigin: 'metrics',
};

const normalizedLoad1m: XYConfig = {
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
};

const loadBreakdown: XYConfig = {
  id: 'loadBreakdown',
  title: i18n.translate('xpack.infra.assetDetails.metricsCharts.load', {
    defaultMessage: 'Load',
  }),
  layers: [
    {
      data: [hostLensFormulas.load1m, hostLensFormulas.load5m, hostLensFormulas.load15m],
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
};

const logRate: XYConfig = {
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
};

const diskSpaceUsageAvailable: XYConfig = {
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
};

const diskSpaceUsageByMountPoint: XYConfig = {
  id: 'DiskSpaceUsageByMountPoint',
  title: i18n.translate('xpack.infra.assetDetails.metricsCharts.diskSpaceByMountingPoint', {
    defaultMessage: 'Disk Space by Mount Point',
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
      ],
      options: {
        seriesType: 'area',
        breakdown: {
          type: TOP_VALUES_TYPE,
          field: 'system.filesystem.mount_point',
          params: {
            size: 5,
          },
        },
      },
      type: 'visualization',
    },
  ],
  overrides: {
    axisLeft: XY_OVERRIDES.axisLeft,
  },
  dataViewOrigin: 'metrics',
};

const diskThroughputReadWrite: XYConfig = {
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
};

const diskIOReadWrite: XYConfig = {
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
};

const rxTx: XYConfig = {
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

export const hostMetricChartsFullPage: XYConfig[] = [
  cpuUsage,
  cpuUsageBreakdown,
  memoryUsage,
  memoryUsageBreakdown,
  normalizedLoad1m,
  loadBreakdown,
  logRate,
  diskSpaceUsageAvailable,
  diskSpaceUsageByMountPoint,
  diskThroughputReadWrite,
  diskIOReadWrite,
  rxTx,
];
