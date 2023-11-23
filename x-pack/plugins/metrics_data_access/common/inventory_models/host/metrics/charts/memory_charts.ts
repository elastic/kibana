/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { DataView } from '@kbn/data-views-plugin/common';
import { i18n } from '@kbn/i18n';
import { ChartModel, XYLayerModel } from '@kbn/lens-embeddable-utils';
import { formulas } from '../formulas';

export const memoryUsageBreakdown = {
  get: ({ dataView }: { dataView: DataView }): ChartModel<XYLayerModel> => ({
    id: 'memoryUsageBreakdown',
    title: i18n.translate('xpack.infra.assetDetails.metricsCharts.memoryUsage', {
      defaultMessage: 'Memory Usage',
    }),
    layers: [
      {
        data: [
          {
            ...formulas.memoryCache,
            label: i18n.translate('xpack.infra.assetDetails.metricsCharts.metric.label.cache', {
              defaultMessage: 'Cache',
            }),
          },
          {
            ...formulas.memoryUsed,
            label: i18n.translate('xpack.infra.assetDetails.metricsCharts.metric.label.used', {
              defaultMessage: 'Used',
            }),
          },
          {
            ...formulas.memoryFreeExcludingCache,
            label: i18n.translate('xpack.infra.assetDetails.metricsCharts.metric.label.free', {
              defaultMessage: 'Free',
            }),
          },
        ],
        options: {
          seriesType: 'area_stacked',
        },
        layerType: 'data',
      },
    ],
    visualOptions: {
      legend: {
        isVisible: true,
        position: 'bottom',
        legendSize: 50 as any,
      },
      yLeftExtent: {
        mode: 'dataBounds',
        lowerBound: 0,
        upperBound: 1,
      },
    },
    visualizationType: 'lnsXY',
    dataView,
  }),
};
