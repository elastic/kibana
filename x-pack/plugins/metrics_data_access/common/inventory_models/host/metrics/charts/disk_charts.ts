/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import type { LensConfigWithId } from '../../../types';
import { formulas } from '../formulas';
import type { ChartArgs } from './types';

export const diskSpaceUsageAvailable = {
  get: ({ dataViewId }: ChartArgs): LensConfigWithId => ({
    id: 'diskSpaceUsageAvailable',
    chartType: 'xy',
    title: i18n.translate('xpack.metricsData.assetDetails.metricsCharts.diskUsage', {
      defaultMessage: 'Disk Usage',
    }),
    layers: [
      {
        ...formulas.diskUsage,
        label: i18n.translate('xpack.metricsData.assetDetails.metricsCharts.diskUsage.label.used', {
          defaultMessage: 'Used',
        }),
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
    ].map((formula) => ({
      seriesType: 'area',
      type: 'series',
      xAxis: '@timestamp',
      value: formula,
    })),
    legend: {
      show: true,
      position: 'bottom',
    },
    axisTitleVisibility: {
      showXAxisTitle: false,
      showYAxisTitle: false,
    },
    ...(dataViewId
      ? {
          dataset: {
            index: dataViewId,
          },
        }
      : {}),
  }),
};

export const diskUsageByMountPoint = {
  get: ({ dataViewId }: ChartArgs): LensConfigWithId => ({
    id: 'DiskUsageByMountPoint',
    chartType: 'xy',
    title: i18n.translate('xpack.metricsData.assetDetails.metricsCharts.diskUsageByMountingPoint', {
      defaultMessage: 'Disk Usage by Mount Point',
    }),
    layers: [
      {
        ...formulas.diskUsage,
        label: i18n.translate('xpack.metricsData.assetDetails.metricsCharts.diskUsage.label.used', {
          defaultMessage: 'Used',
        }),
      },
    ].map((formula) => ({
      seriesType: 'area',
      type: 'series',
      xAxis: '@timestamp',
      breakdown: {
        type: 'topValues',
        field: 'system.filesystem.mount_point',
        size: 5,
      },
      value: formula,
    })),
    emphasizeFitting: true,
    fittingFunction: 'Linear',
    legend: {
      show: true,
      position: 'bottom',
    },
    yBounds: {
      mode: 'custom',
      lowerBound: 0,
      upperBound: 1,
    },
    axisTitleVisibility: {
      showXAxisTitle: false,
      showYAxisTitle: false,
    },
    ...(dataViewId
      ? {
          dataset: {
            index: dataViewId,
          },
        }
      : {}),
  }),
};
export const diskThroughputReadWrite = {
  get: ({ dataViewId }: ChartArgs): LensConfigWithId => ({
    id: 'diskThroughputReadWrite',
    chartType: 'xy',
    title: i18n.translate('xpack.metricsData.assetDetails.metricsCharts.diskIOPS', {
      defaultMessage: 'Disk IOPS',
    }),
    layers: [
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
    ].map((formula) => ({
      seriesType: 'area',
      type: 'series',
      xAxis: '@timestamp',
      value: formula,
    })),
    emphasizeFitting: true,
    fittingFunction: 'Linear',
    legend: {
      show: true,
      position: 'bottom',
    },
    yBounds: {
      mode: 'custom',
      lowerBound: 0,
      upperBound: 1,
    },
    axisTitleVisibility: {
      showXAxisTitle: false,
      showYAxisTitle: false,
    },
    ...(dataViewId
      ? {
          dataset: {
            index: dataViewId,
          },
        }
      : {}),
  }),
};

export const diskIOReadWrite = {
  get: ({ dataViewId }: ChartArgs): LensConfigWithId => ({
    id: 'diskIOReadWrite',
    chartType: 'xy',
    title: i18n.translate('xpack.metricsData.assetDetails.metricsCharts.diskThroughput', {
      defaultMessage: 'Disk Throughput',
    }),
    layers: [
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
    ].map((formula) => ({
      seriesType: 'area',
      type: 'series',
      xAxis: '@timestamp',
      value: formula,
    })),
    emphasizeFitting: true,
    fittingFunction: 'Linear',
    legend: {
      show: true,
      position: 'bottom',
    },
    yBounds: {
      mode: 'custom',
      lowerBound: 0,
      upperBound: 1,
    },
    axisTitleVisibility: {
      showXAxisTitle: false,
      showYAxisTitle: false,
    },
    ...(dataViewId
      ? {
          dataset: {
            index: dataViewId,
          },
        }
      : {}),
  }),
};
