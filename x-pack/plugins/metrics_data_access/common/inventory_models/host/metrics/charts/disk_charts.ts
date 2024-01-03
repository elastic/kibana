/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import type { LensXYConfig } from '@kbn/lens-embeddable-utils/config_builder';
import { formulas } from '../formulas';
import type { ChartArgs } from './types';

export const diskSpaceUsageAvailable = {
  get: ({ dataView }: ChartArgs): LensXYConfig => ({
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
  }),
};

export const diskUsageByMountPoint = {
  get: ({ dataView }: ChartArgs): LensXYConfig => ({
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
      breakdown: 'system.filesystem.mount_point',
      value: formula,
    })),
    legend: {
      show: true,
      position: 'bottom',
    },
  }),
};
export const diskThroughputReadWrite = {
  get: ({ dataView }: ChartArgs): LensXYConfig => ({
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
  }),
};

export const diskIOReadWrite = {
  get: ({ dataView }: ChartArgs): LensXYConfig => ({
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
  }),
};
