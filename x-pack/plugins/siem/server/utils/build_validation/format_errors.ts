/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import * as t from 'io-ts';

export const formatErrors = (errors: t.Errors): string[] => {
  return errors.map(error => {
    if (error.message != null) {
      return error.message;
    } else {
      const mappedContext = error.context
        .filter(
          entry => entry.key != null && !Number.isInteger(+entry.key) && entry.key.trim() !== ''
        )
        .map(entry => entry.key)
        .join(',');
      return `Invalid value "${error.value}" supplied to "${mappedContext}"`;
    }
  });
};
