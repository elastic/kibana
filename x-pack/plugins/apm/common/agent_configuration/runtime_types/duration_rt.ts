/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import * as t from 'io-ts';
import { either } from 'fp-ts/lib/Either';
import { amountAndUnitToObject } from '../amount_and_unit';

type DurationUnit = 'ms' | 's' | 'm';
export const DURATION_UNITS = ['ms', 's', 'm'];

interface Criteria {
  min?: number;
  max?: number;
  unit?: DurationUnit;
}

function validateDuration(inputAsString: string, { min, max, unit }: Criteria) {
  const { amount, unit: inputUnit } = amountAndUnitToObject(inputAsString);
  const amountAsInt = parseInt(amount, 10);
  const isValidUnit =
    DURATION_UNITS.includes(inputUnit) && (unit ? unit === inputUnit : true);

  const isValidAmount =
    (min ? amountAsInt >= min : true) && (max ? amountAsInt <= max : true);

  return isValidUnit && isValidAmount;
}

export function getDurationRt(criteria: Criteria | Criteria[]) {
  return new t.Type<string, string, unknown>(
    'durationRt',
    t.string.is,
    (input, context) => {
      return either.chain(t.string.validate(input, context), inputAsString => {
        const isValid = Array.isArray(criteria)
          ? criteria
              .map(_criteria => validateDuration(inputAsString, _criteria))
              .some(result => result)
          : validateDuration(inputAsString, criteria);

        return isValid
          ? t.success(inputAsString)
          : t.failure(
              input,
              context,
              `Must have numeric amount and a valid unit (${DURATION_UNITS})`
            );
      });
    },
    t.identity
  );
}

export const durationRt = getDurationRt({ min: 1 });
