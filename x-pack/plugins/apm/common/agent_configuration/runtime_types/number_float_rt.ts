/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import * as t from 'io-ts';
import { either } from 'fp-ts/lib/Either';

export function getNumberFloatRt({ min, max }: { min: number; max: number }) {
  return new t.Type<string, string, unknown>(
    'numberFloatRt',
    t.string.is,
    (input, context) => {
      return either.chain(
        t.string.validate(input, context),
        (inputAsString) => {
          const inputAsFloat = parseFloat(inputAsString);
          const maxThreeDecimals =
            parseFloat(inputAsFloat.toFixed(3)) === inputAsFloat;

          const isValid =
            inputAsFloat >= min && inputAsFloat <= max && maxThreeDecimals;

          return isValid
            ? t.success(inputAsString)
            : t.failure(
                input,
                context,
                `Number must be between ${min} and ${max}`
              );
        }
      );
    },
    t.identity
  );
}

export const numberFloatRt = getNumberFloatRt({ min: 0, max: 1 });
