/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import type { LensBaseLayer } from '@kbn/lens-embeddable-utils/config_builder';
import { MEMORY_FREE_LABEL, MEMORY_USAGE_LABEL } from '../../../shared/charts/constants';

export const memoryCache: LensBaseLayer = {
  label: i18n.translate('xpack.metricsData.assetDetails.formulas.metric.label.cache', {
    defaultMessage: 'cache',
  }),
  value: 'average(system.memory.used.bytes) - average(system.memory.actual.used.bytes)',
  format: 'bytes',
  decimals: 1,
};

export const memoryFree: LensBaseLayer = {
  label: MEMORY_FREE_LABEL,
  value: 'max(system.memory.total) - average(system.memory.actual.used.bytes)',
  format: 'bytes',
  decimals: 1,
};

export const memoryFreeExcludingCache: LensBaseLayer = {
  label: i18n.translate('xpack.metricsData.assetDetails.formulas.metric.label.free', {
    defaultMessage: 'free',
  }),
  value: 'average(system.memory.free)',
  format: 'bytes',
  decimals: 1,
};

export const memoryUsage: LensBaseLayer = {
  label: MEMORY_USAGE_LABEL,
  value: 'average(system.memory.actual.used.pct)',
  format: 'percent',

  decimals: 0,
};

export const memoryUsed: LensBaseLayer = {
  label: i18n.translate('xpack.metricsData.assetDetails.formulas.metric.label.used', {
    defaultMessage: 'used',
  }),
  value: 'average(system.memory.actual.used.bytes)',
  format: 'bytes',
  decimals: 1,
};
