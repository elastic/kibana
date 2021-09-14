/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// @ts-ignore
import numeral from '@elastic/numeral';

/**
 * Formats the supplied number as ordinal e.g. 15 as 15th.
 * Formatting first converts the supplied number to an integer by flooring.
 * @param {number} value to format as an ordinal
 * @return {string} number formatted as an ordinal e.g. 15th
 */
export function numberAsOrdinal(num: number) {
  const int = Math.floor(num);
  return `${numeral(int).format('0o')}`;
}
