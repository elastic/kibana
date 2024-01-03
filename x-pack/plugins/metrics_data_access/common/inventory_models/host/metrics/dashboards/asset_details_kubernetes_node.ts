/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { DataView } from '@kbn/data-views-plugin/common';
import { i18n } from '@kbn/i18n';
import { createDashboardModel } from '../../../create_dashboard_model';
import { formulas } from '../../../kubernetes/node/metrics';

export const assetDetailsKubernetesNode = {
  get: ({ metricsDataView }: { metricsDataView?: DataView }) => {
    // const commonVisualOptions: XYVisualOptions = {
    //   showDottedLine: true,
    //   missingValues: 'Linear',
    //   legend: {
    //     isVisible: true,
    //     position: 'bottom',
    //   },
    // };

    return createDashboardModel({
      dependsOn: ['kubernetes.node'],
      charts: [
        {
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
        },
        {
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
        },
        {
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
        },
        {
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
        },
      ],
    });
  },
};
