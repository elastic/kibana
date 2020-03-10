/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import * as t from 'io-ts';
import { either } from 'fp-ts/lib/Either';

export const transactionMaxSpansRt = new t.Type<string, string, unknown>(
  'transactionMaxSpans',
  t.string.is,
  (input, context) => {
    return either.chain(t.string.validate(input, context), inputAsString => {
      const inputAsInt = parseInt(inputAsString, 10);
      const isValid = inputAsInt >= 0 && inputAsInt <= 32000;
      return isValid
        ? t.success(inputAsString)
        : t.failure(input, context, 'Number must be between 0 and 32000');
    });
  },
  t.identity
);
