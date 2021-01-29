/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import * as t from 'io-ts';

export const toNumberRt = new t.Type<number, unknown, unknown>(
  'ToNumber',
  t.any.is,
  (input, context) => {
    const number = Number(input);
    return !isNaN(number) ? t.success(number) : t.failure(input, context);
  },
  t.identity
);
