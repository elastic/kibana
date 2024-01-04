/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import type { FormulaValueConfig } from '@kbn/lens-embeddable-utils/config_builder';

export const load1m: FormulaValueConfig = {
  label: i18n.translate('xpack.metricsData.assetDetails.formulas.load1m', {
    defaultMessage: 'Load (1m)',
  }),
  formula: 'average(system.load.1)',
  format: {
    id: 'number',
    params: {
      decimals: 1,
    },
  },
};

export const load5m: FormulaValueConfig = {
  label: i18n.translate('xpack.metricsData.assetDetails.formulas.load5m', {
    defaultMessage: 'Load (5m)',
  }),
  formula: 'average(system.load.5)',
  format: {
    id: 'number',
    params: {
      decimals: 1,
    },
  },
};

export const load15m: FormulaValueConfig = {
  label: i18n.translate('xpack.metricsData.assetDetails.formulas.load15m', {
    defaultMessage: 'Load (15m)',
  }),
  formula: 'average(system.load.15)',
  format: {
    id: 'number',
    params: {
      decimals: 1,
    },
  },
};

export const normalizedLoad1m: FormulaValueConfig = {
  label: i18n.translate('xpack.metricsData.assetDetails.formulas.normalizedLoad1m', {
    defaultMessage: 'Normalized Load',
  }),
  formula: 'average(system.load.1) / max(system.load.cores)',
  format: {
    id: 'percent',
    params: {
      decimals: 0,
    },
  },
};
