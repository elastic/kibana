/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { LensConfigWithId } from '../../../types';
import { formulas } from '../formulas';

export const diskCharts = {
  xy: {
    diskSpaceUsageAvailable: {
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
    } as LensConfigWithId,
    diskThroughputReadWrite: {
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
        },
      ],
      fittingFunction: 'Linear',
      legend: {
        show: true,
        position: 'bottom',
      },
      axisTitleVisibility: {
        showXAxisTitle: false,
        showYAxisTitle: false,
      },
    } as LensConfigWithId,
    diskUsageByMountPoint: {
      id: 'DiskUsageByMountPoint',
      chartType: 'xy',
      title: i18n.translate(
        'xpack.metricsData.assetDetails.metricsCharts.diskUsageByMountingPoint',
        {
          defaultMessage: 'Disk Usage by Mount Point',
        }
      ),
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
    } as LensConfigWithId,
    diskIOReadWrite: {
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
        },
      ],
      fittingFunction: 'Linear',
      legend: {
        show: true,
        position: 'bottom',
      },
      axisTitleVisibility: {
        showXAxisTitle: false,
        showYAxisTitle: false,
      },
    } as LensConfigWithId,
    diskSpaceAvailable: {
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
      fittingFunction: 'Linear',
      legend: {
        show: false,
      },
      axisTitleVisibility: {
        showXAxisTitle: false,
        showYAxisTitle: false,
      },
    } as LensConfigWithId,
    diskIORead: {
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
      fittingFunction: 'Linear',
      legend: {
        show: false,
      },
      axisTitleVisibility: {
        showXAxisTitle: false,
        showYAxisTitle: false,
      },
    } as LensConfigWithId,
    diskIOWrite: {
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
      fittingFunction: 'Linear',
      legend: {
        show: false,
      },
      axisTitleVisibility: {
        showXAxisTitle: false,
        showYAxisTitle: false,
      },
    } as LensConfigWithId,
    diskReadThroughput: {
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
      fittingFunction: 'Linear',
      legend: {
        show: false,
      },
      axisTitleVisibility: {
        showXAxisTitle: false,
        showYAxisTitle: false,
      },
    } as LensConfigWithId,
    diskWriteThroughput: {
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
      fittingFunction: 'Linear',
      legend: {
        show: false,
      },
      axisTitleVisibility: {
        showXAxisTitle: false,
        showYAxisTitle: false,
      },
    } as LensConfigWithId,
    diskUsage: {
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
      fittingFunction: 'Linear',
      legend: {
        show: false,
      },
      axisTitleVisibility: {
        showXAxisTitle: false,
        showYAxisTitle: false,
      },
      yBounds: {
        mode: 'custom',
        lowerBound: 0,
        upperBound: 1,
      },
    } as LensConfigWithId,
  },
  metric: {
    diskUsage: {
      id: 'diskUsage',
      chartType: 'metric',
      title: formulas.diskUsage.label,
      trendLine: true,
      ...formulas.diskUsage,
    } as LensConfigWithId,
  },
} as const;
