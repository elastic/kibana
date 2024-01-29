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

export const loadBreakdown = {
  get: ({ dataViewId }: ChartArgs): LensConfigWithId => ({
    id: 'loadBreakdown',
    chartType: 'xy',
    title: i18n.translate('xpack.metricsData.assetDetails.metricsCharts.load', {
      defaultMessage: 'Load',
    }),
    layers: [
      {
        seriesType: 'area',
        type: 'series',
        xAxis: '@timestamp',
        yAxis: [formulas.load1m, formulas.load5m, formulas.load15m],
      },
    ],
    fittingFunction: 'Linear',
    legend: {
      position: 'bottom',
      show: true,
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
