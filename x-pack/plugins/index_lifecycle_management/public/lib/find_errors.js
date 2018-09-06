/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

export const hasErrors = (object, keysToIgnore = []) => {
  let errors = false;
  for (const [key, value] of Object.entries(object)) {
    if (keysToIgnore.includes(key)) continue;
    if (Array.isArray(value) && value.length > 0) {
      errors = true;
      break;
    } else if (value) {
      errors = hasErrors(value, keysToIgnore);
      if (errors) {
        break;
      }
    }
  }
  return errors;
};
