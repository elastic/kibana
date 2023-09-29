/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { nginxLensFormulas } from '../../../formulas';
import { XY_OVERRIDES } from '../../constants';
import type { XYConfig } from '../../types';

export const nginxStubstatusCharts: XYConfig[] = [
  {
    id: 'requestRate',
    title: i18n.translate('xpack.infra.assetDetails.metricsCharts.nginx.requestRate', {
      defaultMessage: 'Request Rate',
    }),

    layers: [
      {
        data: [nginxLensFormulas.requestRate],
        type: 'visualization',
      },
    ],
    dataViewOrigin: 'metrics',
  },
  {
    id: 'activeConnections',
    title: i18n.translate('xpack.infra.assetDetails.metricsCharts.nginx.activeConnections', {
      defaultMessage: 'Active Connections',
    }),

    layers: [
      {
        data: [nginxLensFormulas.activeConnections],
        type: 'visualization',
      },
    ],
    dataViewOrigin: 'metrics',
  },
  {
    id: 'requestsPerConnection',
    title: i18n.translate('xpack.infra.assetDetails.metricsCharts.nginx.requestsPerConnection', {
      defaultMessage: 'Requests Per Connection',
    }),

    layers: [
      {
        data: [nginxLensFormulas.requestsPerConnection],
        type: 'visualization',
      },
    ],
    dataViewOrigin: 'metrics',
  },
];

export const nginxAccessCharts: XYConfig[] = [
  {
    id: 'responseStatusCodes',
    title: i18n.translate('xpack.infra.assetDetails.metricsCharts.nginx.responseStatusCodes', {
      defaultMessage: 'Response Status Codes',
    }),

    layers: [
      {
        data: [
          nginxLensFormulas.successStatusCodes,
          nginxLensFormulas.redirectStatusCodes,
          nginxLensFormulas.clientErrorStatusCodes,
          nginxLensFormulas.serverErrorStatusCodes,
        ],
        options: {
          seriesType: 'area',
        },
        type: 'visualization',
      },
    ],
    overrides: {
      settings: XY_OVERRIDES.settings,
    },
    dataViewOrigin: 'metrics',
  },
];
