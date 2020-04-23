/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import * as t from 'io-ts';
import { either } from 'fp-ts/lib/Either';
import moment, { unitOfTime } from 'moment';
import { amountAndUnitToObject } from '../amount_and_unit';

export const DURATION_UNITS = ['ms', 's', 'm'];

function getDuration({ amount, unit }: { amount: string; unit: string }) {
  return moment.duration(parseInt(amount, 10), unit as unitOfTime.Base);
}

export function getDurationRt({ min, max }: { min?: string; max?: string }) {
  return new t.Type<string, string, unknown>(
    'durationRt',
    t.string.is,
    (input, context) => {
      return either.chain(t.string.validate(input, context), inputAsString => {
        const { amount, unit } = amountAndUnitToObject(inputAsString);
        const inputDuration = getDuration({ amount, unit });
        const minDuration = min
          ? getDuration(amountAndUnitToObject(min))
          : inputDuration;
        const maxDuration = max
          ? getDuration(amountAndUnitToObject(max))
          : inputDuration;

        const isValidUnit = DURATION_UNITS.includes(unit);
        const isValidAmount =
          inputDuration >= minDuration && inputDuration <= maxDuration;

        return isValidUnit && isValidAmount
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

export const durationRt = getDurationRt({ min: '1ms' });
