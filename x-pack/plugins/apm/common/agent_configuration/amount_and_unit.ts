/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

export interface AmountAndUnit {
  amount: number;
  unit: string;
}

export function amountAndUnitToObject(value: string): AmountAndUnit {
  // matches any postive and negative number and its unit.
  const [, amount = '', unit = ''] = value.match(/(^-?\d+)?(\w+)?/) || [];
  return { amount: parseInt(amount, 10), unit };
}

export function amountAndUnitToString({
  amount,
  unit,
}: Omit<AmountAndUnit, 'amount'> & { amount: string | number }) {
  return `${amount}${unit}`;
}
