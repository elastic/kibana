/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import * as t from 'io-ts';
import { either } from 'fp-ts/lib/Either';
import { amountAndUnitToObject } from '../amount_and_unit';

export const DURATION_UNITS = ['ms', 's', 'm'];

export function getDurationRt({ min }: { min: number }) {
  return new t.Type<string, string, unknown>(
    'durationRt',
    t.string.is,
    (input, context) => {
      return either.chain(
        t.string.validate(input, context),
        (inputAsString) => {
          const { amount, unit } = amountAndUnitToObject(inputAsString);
          const amountAsInt = parseInt(amount, 10);
          const isValidUnit = DURATION_UNITS.includes(unit);
          const isValid = amountAsInt >= min && isValidUnit;

          return isValid
            ? t.success(inputAsString)
            : t.failure(
                input,
                context,
                `Must have numeric amount and a valid unit (${DURATION_UNITS})`
              );
        }
      );
    },
    t.identity
  );
}

export const durationRt = getDurationRt({ min: 1 });
