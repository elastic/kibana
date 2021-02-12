/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as t from 'io-ts';

export const toBooleanRt = new t.Type<boolean, unknown, unknown>(
  'ToBoolean',
  t.boolean.is,
  (input) => {
    let value: boolean;
    if (typeof input === 'string') {
      value = input === 'true';
    } else {
      value = !!input;
    }

    return t.success(value);
  },
  t.identity
);
