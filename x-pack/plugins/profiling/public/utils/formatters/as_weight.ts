/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { asNumber } from './as_number';

const ONE_POUND_TO_A_KILO = 0.45359237;
const ONE_KILO_TO_A_POUND = 2.20462;

export function asWeight(value: number, unit: 'kgs' | 'lbs'): string {
  const formattedValue = asNumber(value);

  if (unit === 'lbs') {
    const kgs = asNumber(Number(value * ONE_POUND_TO_A_KILO));
    return `${formattedValue} lbs / ${kgs} kg`;
  }

  const lbs = asNumber(Number(value * ONE_KILO_TO_A_POUND));
  return `${lbs} lbs / ${formattedValue} kg`;
}
