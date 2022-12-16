/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { asNumber } from './as_number';

const ONE_POUND_TO_A_KILO = 0.45359237;

export function asWeight(valueInPounds: number) {
  const lbs = asNumber(valueInPounds);
  const kgs = asNumber(Number(valueInPounds * ONE_POUND_TO_A_KILO));

  return i18n.translate('xpack.profiling.formatters.weight', {
    defaultMessage: `{lbs} lbs / {kgs} kg`,
    values: {
      lbs,
      kgs,
    },
  });
}
