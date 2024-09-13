/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as t from 'io-ts';
import { either } from 'fp-ts/lib/Either';

export const floatFourDecimalPlacesRt = new t.Type<string, string, unknown>(
  'floatFourDecimalPlacesRt',
  t.string.is,
  (input, context) => {
    return either.chain(t.string.validate(input, context), (inputAsString) => {
      const inputAsFloat = parseFloat(inputAsString);
      const maxFourDecimals = parseFloat(inputAsFloat.toFixed(4)) === inputAsFloat;

      const isValid = inputAsFloat >= 0 && inputAsFloat <= 1 && maxFourDecimals;

      return isValid
        ? t.success(inputAsString)
        : t.failure(input, context, 'Must be a number between 0.0000 and 1');
    });
  },
  t.identity
);
