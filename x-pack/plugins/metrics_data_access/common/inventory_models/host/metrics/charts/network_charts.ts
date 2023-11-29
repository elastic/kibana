/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import type { XYChartModel } from '@kbn/lens-embeddable-utils';
import { formulas } from '../formulas';
import type { ChartArgs } from './types';

export const rxTx = {
  get: ({ dataView }: ChartArgs): XYChartModel => ({
    id: 'rxTx',
    title: i18n.translate('xpack.metricsData.assetDetails.metricsCharts.network', {
      defaultMessage: 'Network',
    }),
    layers: [
      {
        data: [
          {
            ...formulas.rx,
            label: i18n.translate('xpack.metricsData.assetDetails.metricsCharts.network.label.rx', {
              defaultMessage: 'Inbound (RX)',
            }),
          },
          {
            ...formulas.tx,
            label: i18n.translate('xpack.metricsData.assetDetails.metricsCharts.network.label.tx', {
              defaultMessage: 'Outbound (TX)',
            }),
          },
        ],
        options: {
          seriesType: 'area',
        },

        layerType: 'data',
      },
    ],
    visualOptions: {
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
