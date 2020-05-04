/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

interface AmountAndUnit {
  amount: string;
  unit: string;
}

export function amountAndUnitToObject(value: string): AmountAndUnit {
  // matches any postive and negative number and its unit.
  const [, amount = '', unit = ''] = value.match(/(^-?\d+)?(\w+)?/) || [];
  return { amount, unit };
}

export function amountAndUnitToString({ amount, unit }: AmountAndUnit) {
  return `${amount}${unit}`;
}
