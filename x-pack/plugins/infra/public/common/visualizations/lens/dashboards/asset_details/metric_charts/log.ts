/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { hostLensFormulas } from '../../../../constants';
import type { XYConfig } from './types';

export const logRate: XYConfig = {
  id: 'logRate',
  title: i18n.translate('xpack.infra.assetDetails.metricsCharts.logRate', {
    defaultMessage: 'Log Rate',
  }),
  layers: [
    {
      data: [hostLensFormulas.logRate],
      type: 'visualization',
    },
  ],
  dataViewOrigin: 'logs',
};
