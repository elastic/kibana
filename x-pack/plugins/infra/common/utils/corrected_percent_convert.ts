/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

const correctedPctConvert = (v: number, decimalToPct: boolean) => {
  // Correct floating point precision
  const replacementPattern = decimalToPct ? new RegExp(/0?\./) : '.';
  const numberOfDigits = String(v).replace(replacementPattern, '').length;
  const multipliedValue = decimalToPct ? v * 100 : v / 100;
  return parseFloat(multipliedValue.toPrecision(numberOfDigits));
};

export const decimalToPct = (v: number) => correctedPctConvert(v, true);
export const pctToDecimal = (v: number) => correctedPctConvert(v, false);
