/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { i18n } from '@kbn/i18n';
import { createDashboardModel } from '../../../create_dashboard_model';
import { formulas } from '../../../kubernetes/node/metrics';

export const assetDetailsKubernetesNode = {
  get: ({ metricsDataViewId }: { metricsDataViewId?: string }) => {
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
          layers: [formulas.nodeCpuCapacity, formulas.nodeCpuUsed].map((formula) => ({
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
          ...(metricsDataViewId
            ? {
                dataset: {
                  index: metricsDataViewId,
                },
              }
            : {}),
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
          layers: [formulas.nodeMemoryCapacity, formulas.nodeMemoryUsed].map((formula) => ({
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
          ...(metricsDataViewId
            ? {
                dataset: {
                  index: metricsDataViewId,
                },
              }
            : {}),
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
          layers: [formulas.nodeDiskCapacity, formulas.nodeDiskUsed].map((formula) => ({
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
          ...(metricsDataViewId
            ? {
                dataset: {
                  index: metricsDataViewId,
                },
              }
            : {}),
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
          layers: [formulas.nodePodCapacity, formulas.nodePodUsed].map((formula) => ({
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
          ...(metricsDataViewId
            ? {
                dataset: {
                  index: metricsDataViewId,
                },
              }
            : {}),
        },
      ],
    });
  },
};
