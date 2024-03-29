/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { LensConfigWithId } from '../../../types';
import { formulas } from '../formulas';
import {
  DEFAULT_XY_FITTING_FUNCTION,
  DEFAULT_XY_HIDDEN_AXIS_TITLE,
  DEFAULT_XY_HIDDEN_LEGEND,
  DEFAULT_XY_LEGEND,
  DEFAULT_XY_YBOUNDS,
} from '../../../shared/charts/constants';

const diskThroughputReadWrite: LensConfigWithId = {
  id: 'diskThroughputReadWrite',
  chartType: 'xy',
  title: i18n.translate('xpack.metricsData.assetDetails.metricsCharts.diskIOPS', {
    defaultMessage: 'Disk IOPS',
  }),
  layers: [
    {
      seriesType: 'area',
      type: 'series',
      xAxis: '@timestamp',
      yAxis: [
        {
          ...formulas.diskIORead,
          label: i18n.translate('xpack.metricsData.assetDetails.metricsCharts.metric.label.read', {
            defaultMessage: 'Read',
          }),
        },
        {
          ...formulas.diskIOWrite,
          label: i18n.translate('xpack.metricsData.assetDetails.metricsCharts.metric.label.write', {
            defaultMessage: 'Write',
          }),
        },
      ],
    },
  ],
  ...DEFAULT_XY_FITTING_FUNCTION,
  ...DEFAULT_XY_LEGEND,
  ...DEFAULT_XY_HIDDEN_AXIS_TITLE,
};

const diskUsageByMountPoint: LensConfigWithId = {
  id: 'diskUsageByMountPoint',
  chartType: 'xy',
  title: i18n.translate('xpack.metricsData.assetDetails.metricsCharts.diskUsageByMountingPoint', {
    defaultMessage: 'Disk Usage by Mount Point',
  }),
  layers: [
    {
      seriesType: 'area',
      type: 'series',
      xAxis: '@timestamp',
      breakdown: {
        type: 'topValues',
        field: 'system.filesystem.mount_point',
        size: 5,
      },
      yAxis: [
        {
          ...formulas.diskUsage,
          label: i18n.translate(
            'xpack.metricsData.assetDetails.metricsCharts.diskUsage.label.used',
            {
              defaultMessage: 'Used',
            }
          ),
        },
      ],
    },
  ],
  ...DEFAULT_XY_FITTING_FUNCTION,
  ...DEFAULT_XY_LEGEND,
  ...DEFAULT_XY_YBOUNDS,
  ...DEFAULT_XY_HIDDEN_AXIS_TITLE,
};

const diskIOReadWrite: LensConfigWithId = {
  id: 'diskIOReadWrite',
  chartType: 'xy',
  title: i18n.translate('xpack.metricsData.assetDetails.metricsCharts.diskThroughput', {
    defaultMessage: 'Disk Throughput',
  }),
  layers: [
    {
      seriesType: 'area',
      type: 'series',
      xAxis: '@timestamp',
      yAxis: [
        {
          ...formulas.diskReadThroughput,
          label: i18n.translate('xpack.metricsData.assetDetails.metricsCharts.metric.label.read', {
            defaultMessage: 'Read',
          }),
        },
        {
          ...formulas.diskWriteThroughput,
          label: i18n.translate('xpack.metricsData.assetDetails.metricsCharts.metric.label.write', {
            defaultMessage: 'Write',
          }),
        },
      ],
    },
  ],
  ...DEFAULT_XY_FITTING_FUNCTION,
  ...DEFAULT_XY_LEGEND,
  ...DEFAULT_XY_HIDDEN_AXIS_TITLE,
};

const diskSpaceAvailable: LensConfigWithId = {
  id: 'diskSpaceAvailable',
  chartType: 'xy',
  title: formulas.diskSpaceAvailable.label ?? '',
  layers: [
    {
      seriesType: 'line',
      type: 'series',
      xAxis: '@timestamp',
      yAxis: [formulas.diskSpaceAvailable],
    },
  ],
  ...DEFAULT_XY_FITTING_FUNCTION,
  ...DEFAULT_XY_HIDDEN_LEGEND,
  ...DEFAULT_XY_HIDDEN_AXIS_TITLE,
};

const diskIORead: LensConfigWithId = {
  id: 'diskIORead',
  chartType: 'xy',
  title: formulas.diskIORead.label ?? '',
  layers: [
    {
      seriesType: 'line',
      type: 'series',
      xAxis: '@timestamp',
      yAxis: [formulas.diskIORead],
    },
  ],
  ...DEFAULT_XY_FITTING_FUNCTION,
  ...DEFAULT_XY_HIDDEN_LEGEND,
  ...DEFAULT_XY_HIDDEN_AXIS_TITLE,
};

const diskIOWrite: LensConfigWithId = {
  id: 'diskIOWrite',
  chartType: 'xy',
  title: formulas.diskIOWrite.label ?? '',
  layers: [
    {
      seriesType: 'line',
      type: 'series',
      xAxis: '@timestamp',
      yAxis: [formulas.diskIOWrite],
    },
  ],
  ...DEFAULT_XY_FITTING_FUNCTION,
  ...DEFAULT_XY_HIDDEN_LEGEND,
  ...DEFAULT_XY_HIDDEN_AXIS_TITLE,
};

const diskReadThroughput: LensConfigWithId = {
  id: 'diskReadThroughput',
  chartType: 'xy',
  title: formulas.diskReadThroughput.label ?? '',
  layers: [
    {
      seriesType: 'line',
      type: 'series',
      xAxis: '@timestamp',
      yAxis: [formulas.diskReadThroughput],
    },
  ],
  ...DEFAULT_XY_FITTING_FUNCTION,
  ...DEFAULT_XY_HIDDEN_LEGEND,
  ...DEFAULT_XY_HIDDEN_AXIS_TITLE,
};

const diskWriteThroughput: LensConfigWithId = {
  id: 'diskWriteThroughput',
  chartType: 'xy',
  title: formulas.diskWriteThroughput.label ?? '',
  layers: [
    {
      seriesType: 'line',
      type: 'series',
      xAxis: '@timestamp',
      yAxis: [formulas.diskWriteThroughput],
    },
  ],
  ...DEFAULT_XY_FITTING_FUNCTION,
  ...DEFAULT_XY_HIDDEN_LEGEND,
  ...DEFAULT_XY_HIDDEN_AXIS_TITLE,
};

const diskSpaceUsageAvailable: LensConfigWithId = {
  id: 'diskSpaceUsageAvailable',
  chartType: 'xy',
  title: i18n.translate('xpack.metricsData.assetDetails.metricsCharts.diskUsage', {
    defaultMessage: 'Disk Usage',
  }),
  layers: [
    {
      seriesType: 'area',
      type: 'series',
      xAxis: '@timestamp',
      yAxis: [
        {
          ...formulas.diskUsage,
          label: i18n.translate(
            'xpack.metricsData.assetDetails.metricsCharts.diskUsage.label.used',
            {
              defaultMessage: 'Used',
            }
          ),
        },
        {
          ...formulas.diskSpaceAvailability,
          label: i18n.translate(
            'xpack.metricsData.assetDetails.metricsCharts.diskUsage.label.available',
            {
              defaultMessage: 'Available',
            }
          ),
        },
      ],
    },
  ],
  ...DEFAULT_XY_FITTING_FUNCTION,
  ...DEFAULT_XY_LEGEND,
  ...DEFAULT_XY_YBOUNDS,
  ...DEFAULT_XY_HIDDEN_AXIS_TITLE,
};

const diskUsageXY: LensConfigWithId = {
  id: 'diskUsage',
  chartType: 'xy',
  title: formulas.diskUsage.label ?? '',
  layers: [
    {
      seriesType: 'line',
      type: 'series',
      xAxis: '@timestamp',
      yAxis: [formulas.diskUsage],
    },
  ],
  ...DEFAULT_XY_FITTING_FUNCTION,
  ...DEFAULT_XY_HIDDEN_LEGEND,
  ...DEFAULT_XY_YBOUNDS,
  ...DEFAULT_XY_HIDDEN_AXIS_TITLE,
};

const diskUsageMetric: LensConfigWithId = {
  id: 'diskUsage',
  chartType: 'metric',
  title: formulas.diskUsage.label ?? '',
  trendLine: true,
  ...formulas.diskUsage,
};

export const disk = {
  xy: {
    diskSpaceUsageAvailable,
    diskThroughputReadWrite,
    diskUsageByMountPoint,
    diskIOReadWrite,
    diskSpaceAvailable,
    diskIORead,
    diskIOWrite,
    diskReadThroughput,
    diskWriteThroughput,
    diskUsage: diskUsageXY,
  },
  metric: {
    diskUsage: diskUsageMetric,
  },
} as const;
