/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { i18n } from '@kbn/i18n';
import type { LensXYConfigBase } from '@kbn/lens-embeddable-utils/config_builder';
import { createDashboardModel } from '../../../create_dashboard_model';
import { formulas } from '../../../kubernetes/node/metrics';

export const assetDetailsKubernetesNode = {
  get: ({ metricsDataViewId }: { metricsDataViewId?: string }) => {
    const baseConfig: Partial<LensXYConfigBase> = {
      fittingFunction: 'Linear',
      axisTitleVisibility: {
        showXAxisTitle: false,
        showYAxisTitle: false,
      },
      legend: {
        show: true,
        position: 'bottom',
      },
      ...(metricsDataViewId
        ? {
            dataset: {
              index: metricsDataViewId,
            },
          }
        : {}),
    };

    return createDashboardModel({
      dependsOn: ['kubernetes.node'],
      charts: [
        {
          id: 'nodeCpuCapacity',
          chartType: 'xy',
          title: i18n.translate(
            'xpack.metricsData.assetDetails.metricsCharts.kubernetes.nodeCpuCapacity',
            {
              defaultMessage: 'Node CPU Capacity',
            }
          ),
          layers: [
            {
              seriesType: 'area',
              type: 'series',
              xAxis: '@timestamp',
              yAxis: [formulas.nodeCpuCapacity, formulas.nodeCpuUsed],
            },
          ],
          ...baseConfig,
        },
        {
          id: 'nodeMemoryCapacity',
          chartType: 'xy',
          title: i18n.translate(
            'xpack.metricsData.assetDetails.metricsCharts.kubernetes.nodeMemoryCapacity',
            {
              defaultMessage: 'Node Memory Capacity',
            }
          ),
          layers: [
            {
              seriesType: 'area',
              type: 'series',
              xAxis: '@timestamp',
              yAxis: [formulas.nodeMemoryCapacity, formulas.nodeMemoryUsed],
            },
          ],
          ...baseConfig,
        },
        {
          id: 'nodeDiskCapacity',
          chartType: 'xy',
          title: i18n.translate(
            'xpack.metricsData.assetDetails.metricsCharts.kubernetes.nodeDiskCapacity',
            {
              defaultMessage: 'Node Disk Capacity',
            }
          ),
          layers: [
            {
              seriesType: 'area',
              type: 'series',
              xAxis: '@timestamp',
              yAxis: [formulas.nodeDiskCapacity, formulas.nodeDiskUsed],
            },
          ],
          ...baseConfig,
        },
        {
          id: 'nodePodCapacity',
          chartType: 'xy',
          title: i18n.translate(
            'xpack.metricsData.assetDetails.metricsCharts.kubernetes.nodePodCapacity',
            {
              defaultMessage: 'Node Pod Capacity',
            }
          ),
          layers: [
            {
              seriesType: 'area',
              type: 'series',
              xAxis: '@timestamp',
              yAxis: [formulas.nodePodCapacity, formulas.nodePodUsed],
            },
          ],
          ...baseConfig,
        },
      ],
    });
  },
};
