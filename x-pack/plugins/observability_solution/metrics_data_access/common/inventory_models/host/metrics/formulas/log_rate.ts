/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import type { LensBaseLayer } from '@kbn/lens-embeddable-utils/config_builder';

export const logRate: LensBaseLayer = {
  label: i18n.translate('xpack.metricsData.assetDetails.formulas.logRate', {
    defaultMessage: 'Log Rate',
  }),
  value: 'differences(cumulative_sum(count()))',
  format: 'number',
  decimals: 0,
  normalizeByUnit: 's',
};
