/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import * as t from 'io-ts';
import { Either, either } from 'fp-ts/lib/Either';

export type StringToPositiveNumberC = t.Type<number, string, unknown>;

/**
 * Types the StrongToPositiveNumber as:
 *   - If a string this converts the string into a number
 *   - Ensures it is a number (and not NaN)
 *   - Ensures it is positive number
 */
export const StringToPositiveNumber: StringToPositiveNumberC = new t.Type<number, string, unknown>(
  'StringToPositiveNumber',
  t.number.is,
  (input, context): Either<t.Errors, number> => {
    return either.chain(
      t.string.validate(input, context),
      (numberAsString): Either<t.Errors, number> => {
        const stringAsNumber = +numberAsString;
        if (numberAsString.trim().length === 0 || isNaN(stringAsNumber) || stringAsNumber <= 0) {
          return t.failure(input, context);
        } else {
          return t.success(stringAsNumber);
        }
      }
    );
  },
  String
);
