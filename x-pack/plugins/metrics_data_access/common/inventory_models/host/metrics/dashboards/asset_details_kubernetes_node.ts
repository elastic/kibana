/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { DataView } from '@kbn/data-views-plugin/common';
import { i18n } from '@kbn/i18n';
import type { XYVisualOptions } from '@kbn/lens-embeddable-utils';
import { createDashboardModel } from '../../../create_dashboard_model';
import { formulas } from '../../../kubernetes/node/metrics';

export const assetDetailsKubernetesNode = {
  get: ({ metricsDataView }: { metricsDataView?: DataView }) => {
    const commonVisualOptions: XYVisualOptions = {
      showDottedLine: true,
      missingValues: 'Linear',
      legend: {
        isVisible: true,
        position: 'bottom',
      },
    };

    return createDashboardModel({
      dependsOn: ['kubernetes.node'],
      charts: [
        {
          id: 'nodeCpuCapacity',
          title: i18n.translate(
            'xpack.metricsData.assetDetails.metricsCharts.kubernetes.nodeCpuCapacity',
            {
              defaultMessage: 'Node CPU Capacity',
            }
          ),
          layers: [
            {
              data: [formulas.nodeCpuCapacity, formulas.nodeCpuUsed],
              options: {
                seriesType: 'area',
              },
              layerType: 'data',
            },
          ],
          dataView: metricsDataView,
          visualizationType: 'lnsXY',
          visualOptions: commonVisualOptions,
        },
        {
          id: 'nodeMemoryCapacity',
          title: i18n.translate(
            'xpack.metricsData.assetDetails.metricsCharts.kubernetes.nodeMemoryCapacity',
            {
              defaultMessage: 'Node Memory Capacity',
            }
          ),
          layers: [
            {
              data: [formulas.nodeMemoryCapacity, formulas.nodeMemoryUsed],
              options: {
                seriesType: 'area',
              },
              layerType: 'data',
            },
          ],
          visualizationType: 'lnsXY',
          dataView: metricsDataView,
          visualOptions: commonVisualOptions,
        },
        {
          id: 'nodeDiskCapacity',
          title: i18n.translate(
            'xpack.metricsData.assetDetails.metricsCharts.kubernetes.nodeDiskCapacity',
            {
              defaultMessage: 'Node Disk Capacity',
            }
          ),
          layers: [
            {
              data: [formulas.nodeDiskCapacity, formulas.nodeDiskUsed],
              options: {
                seriesType: 'area',
              },
              layerType: 'data',
            },
          ],
          visualizationType: 'lnsXY',
          dataView: metricsDataView,
          visualOptions: commonVisualOptions,
        },
        {
          id: 'nodePodCapacity',
          title: i18n.translate(
            'xpack.metricsData.assetDetails.metricsCharts.kubernetes.nodePodCapacity',
            {
              defaultMessage: 'Node Pod Capacity',
            }
          ),
          layers: [
            {
              data: [formulas.nodePodCapacity, formulas.nodePodUsed],
              options: {
                seriesType: 'area',
              },
              layerType: 'data',
            },
          ],
          visualizationType: 'lnsXY',
          dataView: metricsDataView,
          visualOptions: commonVisualOptions,
        },
      ],
    });
  },
};
