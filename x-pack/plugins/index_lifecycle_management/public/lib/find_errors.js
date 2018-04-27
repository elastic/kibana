/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

export const hasErrors = (object, keysToIgnore = []) => {
  const errors = [];
  for (const [key, value] of Object.entries(object)) {
    if (keysToIgnore.includes(key)) continue;
    if (Array.isArray(value) && value.length > 0) {
      return true;
      errors.push(...value);
    } else if (value) {
      return hasErrors(value, keysToIgnore);
    }
  }
  return false;
};
