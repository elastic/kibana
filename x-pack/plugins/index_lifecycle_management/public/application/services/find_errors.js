/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

export const findFirstError = (object, topLevel = true) => {
  let firstError;
  const keys = topLevel ? ['policyName', 'hot', 'warm', 'cold', 'delete'] : Object.keys(object);
  for (const key of keys) {
    const value = object[key];
    if (Array.isArray(value) && value.length > 0) {
      firstError = key;
      break;
    } else if (value) {
      firstError = findFirstError(value, false);
      if (firstError) {
        firstError = `${key}.${firstError}`;
        break;
      }
    }
  }
  return firstError;
};
