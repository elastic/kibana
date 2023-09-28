/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import type { FormulaValueConfig } from '@kbn/lens-embeddable-utils';

export const memoryCache: FormulaValueConfig = {
  label: i18n.translate('xpack.infra.assetDetails.formulas.metric.label.cache', {
    defaultMessage: 'cache',
  }),
  value: 'average(system.memory.used.bytes) - average(system.memory.actual.used.bytes)',
  format: {
    id: 'bytes',
    params: {
      decimals: 1,
    },
  },
};
