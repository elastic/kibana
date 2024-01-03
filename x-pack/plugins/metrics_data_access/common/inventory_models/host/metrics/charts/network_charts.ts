/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import type { LensXYConfig } from '@kbn/lens-embeddable-utils/config_builder';
import { formulas } from '../formulas';
import type { ChartArgs } from './types';

export const rxTx = {
  get: ({ dataView }: ChartArgs): LensXYConfig => ({
    chartType: 'xy',
    title: i18n.translate('xpack.metricsData.assetDetails.metricsCharts.network', {
      defaultMessage: 'Network',
    }),
    layers: [
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
    ].map((formula) => ({
      seriesType: 'area',
      type: 'series',
      xAxis: '@timestamp',
      value: formula,
    })),
  }),
};
