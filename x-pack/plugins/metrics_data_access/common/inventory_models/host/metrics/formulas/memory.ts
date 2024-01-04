/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import type { FormulaValueConfig } from '@kbn/lens-embeddable-utils/config_builder';

export const memoryCache: FormulaValueConfig = {
  label: i18n.translate('xpack.metricsData.assetDetails.formulas.metric.label.cache', {
    defaultMessage: 'cache',
  }),
  formula: 'average(system.memory.used.bytes) - average(system.memory.actual.used.bytes)',
  format: {
    id: 'bytes',
    params: {
      decimals: 1,
    },
  },
};

export const memoryFree: FormulaValueConfig = {
  label: i18n.translate('xpack.metricsData.assetDetails.formulas.memoryFree', {
    defaultMessage: 'Memory Free',
  }),
  formula: 'max(system.memory.total) - average(system.memory.actual.used.bytes)',
  format: {
    id: 'bytes',
    params: {
      decimals: 1,
    },
  },
};

export const memoryFreeExcludingCache: FormulaValueConfig = {
  label: i18n.translate('xpack.metricsData.assetDetails.formulas.metric.label.free', {
    defaultMessage: 'free',
  }),
  formula: 'average(system.memory.free)',
  format: {
    id: 'bytes',
    params: {
      decimals: 1,
    },
  },
};

export const memoryUsage: FormulaValueConfig = {
  label: i18n.translate('xpack.metricsData.assetDetails.formulas.memoryUsage', {
    defaultMessage: 'Memory Usage',
  }),
  formula: 'average(system.memory.actual.used.pct)',
  format: {
    id: 'percent',
    params: {
      decimals: 0,
    },
  },
};

export const memoryUsed: FormulaValueConfig = {
  label: i18n.translate('xpack.metricsData.assetDetails.formulas.metric.label.used', {
    defaultMessage: 'used',
  }),
  formula: 'average(system.memory.actual.used.bytes)',
  format: {
    id: 'bytes',
    params: {
      decimals: 1,
    },
  },
};
