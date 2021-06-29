/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as t from 'io-ts';
import { isObject } from 'lodash/fp';

/**
 * @deprecated Use packages/kbn-securitysolution-io-ts-utils/src/format_errors/index.ts
 */
export const formatErrors = (errors: t.Errors): string[] => {
  const err = errors.map((error) => {
    if (error.message != null) {
      return error.message;
    } else {
      const keyContext = error.context
        .filter(
          (entry) => entry.key != null && !Number.isInteger(+entry.key) && entry.key.trim() !== ''
        )
        .map((entry) => entry.key)
        .join(',');

      const nameContext = error.context.find((entry) => entry.type?.name?.length > 0);
      const suppliedValue =
        keyContext !== '' ? keyContext : nameContext != null ? nameContext.type.name : '';
      const value = isObject(error.value) ? JSON.stringify(error.value) : error.value;
      return `Invalid value "${value}" supplied to "${suppliedValue}"`;
    }
  });

  return [...new Set(err)];
};
