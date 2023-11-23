/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import type { FormulaValueConfig } from '@kbn/lens-embeddable-utils';

export const load15m: FormulaValueConfig = {
  label: i18n.translate('xpack.infra.assetDetails.formulas.load15m', {
    defaultMessage: 'Load (15m)',
  }),
  value: 'average(system.load.15)',
  format: {
    id: 'number',
    params: {
      decimals: 1,
    },
  },
};
