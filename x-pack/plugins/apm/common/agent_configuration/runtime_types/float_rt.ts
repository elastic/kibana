/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import * as t from 'io-ts';
import { either } from 'fp-ts/lib/Either';

export const floatRt = new t.Type<string, string, unknown>(
  'floatRt',
  t.string.is,
  (input, context) => {
    return either.chain(t.string.validate(input, context), (inputAsString) => {
      const inputAsFloat = parseFloat(inputAsString);
      const maxThreeDecimals =
        parseFloat(inputAsFloat.toFixed(3)) === inputAsFloat;

      const isValid =
        inputAsFloat >= 0 && inputAsFloat <= 1 && maxThreeDecimals;

      return isValid
        ? t.success(inputAsString)
        : t.failure(input, context, 'Must be a number between 0.000 and 1');
    });
  },
  t.identity
);
