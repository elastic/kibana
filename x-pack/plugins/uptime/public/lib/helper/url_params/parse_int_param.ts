/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

/**
 * Parses an integer value from a string.
 * @param value The string to be parsed.
 * @param defaultValue If `value` is NaN, this number is returned.
 */
export const parseIntParam = (value: string | undefined, defaultValue: number): number => {
  const parsed = parseInt(value || '', 10);
  return isNaN(parsed) ? defaultValue : parsed;
};
