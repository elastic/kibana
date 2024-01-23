/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import type { XYChartModel } from '@kbn/lens-embeddable-utils';
import { formulas } from '../formulas';
import type { ChartArgs } from './types';

const TOP_VALUES_SIZE = 5;

export const diskSpaceUsageAvailable = {
  get: ({ dataView }: ChartArgs): XYChartModel => ({
    id: 'diskSpaceUsageAvailable',
    title: i18n.translate('xpack.metricsData.assetDetails.metricsCharts.diskUsage', {
      defaultMessage: 'Disk Usage',
    }),
    layers: [
      {
        data: [
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
        options: {
          seriesType: 'area',
        },
        layerType: 'data',
      },
    ],
    visualizationType: 'lnsXY',
    dataView,
  }),
};

export const diskUsageByMountPoint = {
  get: ({ dataView }: ChartArgs): XYChartModel => ({
    id: 'DiskUsageByMountPoint',
    title: i18n.translate('xpack.metricsData.assetDetails.metricsCharts.diskUsageByMountingPoint', {
      defaultMessage: 'Disk Usage by Mount Point',
    }),
    layers: [
      {
        data: [
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
        options: {
          seriesType: 'area',
          breakdown: {
            type: 'top_values',
            field: 'system.filesystem.mount_point',
            params: {
              size: TOP_VALUES_SIZE,
            },
          },
        },
        layerType: 'data',
      },
    ],
    visualOptions: {
      legend: {
        isVisible: true,
        position: 'bottom',
        legendSize: 50 as any,
      },
      yLeftExtent: {
        mode: 'dataBounds',
        lowerBound: 0,
        upperBound: 1,
      },
    },
    visualizationType: 'lnsXY',
    dataView,
  }),
};
export const diskThroughputReadWrite = {
  get: ({ dataView }: ChartArgs): XYChartModel => ({
    id: 'diskThroughputReadWrite',
    title: i18n.translate('xpack.metricsData.assetDetails.metricsCharts.diskIOPS', {
      defaultMessage: 'Disk IOPS',
    }),
    layers: [
      {
        data: [
          {
            ...formulas.diskIORead,
            label: i18n.translate(
              'xpack.metricsData.assetDetails.metricsCharts.metric.label.read',
              {
                defaultMessage: 'Read',
              }
            ),
          },
          {
            ...formulas.diskIOWrite,
            label: i18n.translate(
              'xpack.metricsData.assetDetails.metricsCharts.metric.label.write',
              {
                defaultMessage: 'Write',
              }
            ),
          },
        ],
        options: {
          seriesType: 'area',
        },
        layerType: 'data',
      },
    ],
    visualOptions: {
      yLeftExtent: {
        mode: 'dataBounds',
        lowerBound: 0,
        upperBound: 1,
      },
    },
    visualizationType: 'lnsXY',
    dataView,
  }),
};

export const diskIOReadWrite = {
  get: ({ dataView }: ChartArgs): XYChartModel => ({
    id: 'diskIOReadWrite',
    title: i18n.translate('xpack.metricsData.assetDetails.metricsCharts.diskThroughput', {
      defaultMessage: 'Disk Throughput',
    }),
    layers: [
      {
        data: [
          {
            ...formulas.diskReadThroughput,
            label: i18n.translate(
              'xpack.metricsData.assetDetails.metricsCharts.metric.label.read',
              {
                defaultMessage: 'Read',
              }
            ),
          },
          {
            ...formulas.diskWriteThroughput,
            label: i18n.translate(
              'xpack.metricsData.assetDetails.metricsCharts.metric.label.write',
              {
                defaultMessage: 'Write',
              }
            ),
          },
        ],
        options: {
          seriesType: 'area',
        },
        layerType: 'data',
      },
    ],
    visualOptions: {
      yLeftExtent: {
        mode: 'dataBounds',
        lowerBound: 0,
        upperBound: 1,
      },
    },
    visualizationType: 'lnsXY',
    dataView,
  }),
};
