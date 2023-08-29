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

export const memoryUsage: XYConfig = {
  id: 'memoryUsage',
  title: i18n.translate('xpack.infra.assetDetails.metricsCharts.memoryUsage', {
    defaultMessage: 'Memory Usage',
  }),
  layers: [
    {
      data: [hostLensFormulas.memoryUsage],
      type: 'visualization',
    },
  ],
  dataViewOrigin: 'metrics',
  overrides: {
    axisLeft: XY_OVERRIDES.axisLeft,
  },
};

export const memoryUsageBreakdown: XYConfig = {
  id: 'memoryUsage',
  title: i18n.translate('xpack.infra.assetDetails.metricsCharts.memoryUsage', {
    defaultMessage: 'Memory Usage',
  }),
  layers: [
    {
      data: [
        {
          ...hostLensFormulas.memoryCache,
          label: i18n.translate('xpack.infra.assetDetails.metricsCharts.metric.label.cache', {
            defaultMessage: 'Cache',
          }),
        },
        {
          ...hostLensFormulas.memoryUsed,
          label: i18n.translate('xpack.infra.assetDetails.metricsCharts.metric.label.used', {
            defaultMessage: 'Used',
          }),
        },
        {
          ...hostLensFormulas.memoryFreeExcludingCache,
          label: i18n.translate('xpack.infra.assetDetails.metricsCharts.metric.label.free', {
            defaultMessage: 'Free',
          }),
        },
      ],
      options: {
        seriesType: 'area_stacked',
      },
      type: 'visualization',
    },
  ],
  overrides: {
    settings: XY_OVERRIDES.settings,
  },
  dataViewOrigin: 'metrics',
};
