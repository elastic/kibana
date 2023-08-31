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

export const rxTx: XYConfig = {
  id: 'rxTx',
  title: i18n.translate('xpack.infra.assetDetails.metricsCharts.network', {
    defaultMessage: 'Network',
  }),
  layers: [
    {
      data: [
        {
          ...hostLensFormulas.rx,
          label: i18n.translate('xpack.infra.assetDetails.metricsCharts.network.label.rx', {
            defaultMessage: 'Inbound (RX)',
          }),
        },
        {
          ...hostLensFormulas.tx,
          label: i18n.translate('xpack.infra.assetDetails.metricsCharts.network.label.tx', {
            defaultMessage: 'Outbound (TX)',
          }),
        },
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
};
