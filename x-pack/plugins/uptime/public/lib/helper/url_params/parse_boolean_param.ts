/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

/**
 * Parses a boolean value from a string.
 * @param value The string to check for a boolean value. Must be `true` or `false`.
 * @param defaultValue If an invalid `value` is provided, this value is returned.
 */
export const parseBooleanParam = (value: string | undefined, defaultValue: boolean): boolean => {
  if (value === 'true') {
    return true;
  }
  if (value === 'false') {
    return false;
  }
  return defaultValue;
};
