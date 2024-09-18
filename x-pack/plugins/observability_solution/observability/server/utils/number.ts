/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

const SIX_DIGITS = 1000000;

export function toHighPrecision(value: number): number {
  return Math.round(value * SIX_DIGITS) / SIX_DIGITS;
}
