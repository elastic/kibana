/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { hostLensFormulas } from '../../../../constants';
import { XY_OVERRIDES } from '../../constants';
import type { XYConfig } from './types';

export const nginxRequestRate: XYConfig = {
  id: 'RequestRate',
  title: i18n.translate('xpack.infra.assetDetails.metricsCharts.nginx.requestRate', {
    defaultMessage: 'Request Rate',
  }),

  layers: [
    {
      data: [hostLensFormulas.nginxRequestRate],
      type: 'visualization',
    },
  ],
  dataViewOrigin: 'metrics',
  overrides: {
    axisLeft: XY_OVERRIDES.axisLeft,
  },
};

export const nginxActiveConnections: XYConfig = {
  id: 'ActiveConnections',
  title: i18n.translate('xpack.infra.assetDetails.metricsCharts.nginx.ActiveConnections', {
    defaultMessage: 'Active Connections',
  }),

  layers: [
    {
      data: [hostLensFormulas.nginxActiveConnections],
      type: 'visualization',
    },
  ],
  dataViewOrigin: 'metrics',
  overrides: {
    axisLeft: XY_OVERRIDES.axisLeft,
  },
};

export const nginxRequestsPerConnection: XYConfig = {
  id: 'RequestsPerConnection',
  title: i18n.translate('xpack.infra.assetDetails.metricsCharts.nginx.RequestsPerConnection', {
    defaultMessage: 'Requests Per Connection',
  }),

  layers: [
    {
      data: [hostLensFormulas.nginxRequestsPerConnection],
      type: 'visualization',
    },
  ],
  dataViewOrigin: 'metrics',
};
