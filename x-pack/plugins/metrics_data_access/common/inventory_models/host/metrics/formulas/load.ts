/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import type { LensBaseLayer } from '@kbn/lens-embeddable-utils/config_builder';

export const load1m: LensBaseLayer = {
  label: i18n.translate('xpack.metricsData.assetDetails.formulas.load1m', {
    defaultMessage: 'Load (1m)',
  }),
  value: 'average(system.load.1)',
  format: 'number',
  decimals: 1,
};

export const load5m: LensBaseLayer = {
  label: i18n.translate('xpack.metricsData.assetDetails.formulas.load5m', {
    defaultMessage: 'Load (5m)',
  }),
  value: 'average(system.load.5)',
  format: 'number',
  decimals: 1,
};

export const load15m: LensBaseLayer = {
  label: i18n.translate('xpack.metricsData.assetDetails.formulas.load15m', {
    defaultMessage: 'Load (15m)',
  }),
  value: 'average(system.load.15)',
  format: 'number',
  decimals: 1,
};

export const normalizedLoad1m: LensBaseLayer = {
  label: i18n.translate('xpack.metricsData.assetDetails.formulas.normalizedLoad1m', {
    defaultMessage: 'Normalized Load',
  }),
  value: 'average(system.load.1) / max(system.load.cores)',
  format: 'percent',
  decimals: 0,
};
