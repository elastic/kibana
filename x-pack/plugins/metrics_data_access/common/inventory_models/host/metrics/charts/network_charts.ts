/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import type { LensConfigWithId } from '../../../types';
import { formulas } from '../formulas';
import type { ChartArgs } from './types';

export const rxTx = {
  get: ({ dataViewId }: ChartArgs): LensConfigWithId => ({
    id: 'rxTx',
    chartType: 'xy',
    title: i18n.translate('xpack.metricsData.assetDetails.metricsCharts.network', {
      defaultMessage: 'Network',
    }),
    layers: [
      {
        seriesType: 'area',
        type: 'series',
        xAxis: '@timestamp',
        yAxis: [
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
      },
    ],
    fittingFunction: 'Linear',
    legend: {
      show: true,
      position: 'bottom',
    },
    axisTitleVisibility: {
      showXAxisTitle: false,
      showYAxisTitle: false,
    },
    ...(dataViewId
      ? {
          dataset: {
            index: dataViewId,
          },
        }
      : {}),
  }),
};
