/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

export const findFirstError = (errors: any): string | undefined => {
  let firstError;
  const keys = Object.keys(errors);
  for (const key of keys) {
    const value = errors[key];
    if (Array.isArray(value) && value.length > 0) {
      firstError = key;
      break;
    } else if (value) {
      firstError = findFirstError(value);
      if (firstError) {
        firstError = `${key}.${firstError}`;
        break;
      }
    }
  }
  return firstError;
};
