/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { kubernetesLensFormulas } from '../../../formulas';
import { XY_OVERRIDES } from '../../constants';
import type { XYConfig } from '../../types';

export const kubernetesCharts: XYConfig[] = [
  {
    id: 'nodeCpuCapacity',
    title: i18n.translate('xpack.infra.assetDetails.metricsCharts.kubernetes.nodeCpuCapacity', {
      defaultMessage: 'Node CPU Capacity',
    }),

    layers: [
      {
        data: [kubernetesLensFormulas.nodeCpuCapacity, kubernetesLensFormulas.nodeCpuUsed],
        type: 'visualization',
        options: {
          seriesType: 'area',
        },
      },
    ],
    dataViewOrigin: 'metrics',
    overrides: {
      settings: XY_OVERRIDES.settings,
    },
  },
  {
    id: 'nodeMemoryCapacity',
    title: i18n.translate('xpack.infra.assetDetails.metricsCharts.nginx.nodeMemoryCapacity', {
      defaultMessage: 'Node Memory Capacity',
    }),

    layers: [
      {
        data: [kubernetesLensFormulas.nodeMemoryCapacity, kubernetesLensFormulas.nodeMemoryUsed],
        type: 'visualization',
        options: {
          seriesType: 'area',
        },
      },
    ],
    dataViewOrigin: 'metrics',
    overrides: {
      settings: XY_OVERRIDES.settings,
    },
  },
  {
    id: 'nodeDiskCapacity',
    title: i18n.translate('xpack.infra.assetDetails.metricsCharts.nginx.nodeDiskCapacity', {
      defaultMessage: 'Node Disk Capacity',
    }),

    layers: [
      {
        data: [kubernetesLensFormulas.nodeDiskCapacity, kubernetesLensFormulas.nodeDiskUsed],
        type: 'visualization',
        options: {
          seriesType: 'area',
        },
      },
    ],
    dataViewOrigin: 'metrics',
    overrides: {
      settings: XY_OVERRIDES.settings,
    },
  },
  {
    id: 'nodePodCapacity',
    title: i18n.translate('xpack.infra.assetDetails.metricsCharts.nginx.nodePodCapacity', {
      defaultMessage: 'Node Pod Capacity',
    }),

    layers: [
      {
        data: [kubernetesLensFormulas.nodePodCapacity, kubernetesLensFormulas.nodePodUsed],
        type: 'visualization',
        options: {
          seriesType: 'area',
        },
      },
    ],
    dataViewOrigin: 'metrics',
    overrides: {
      settings: XY_OVERRIDES.settings,
    },
  },
];
