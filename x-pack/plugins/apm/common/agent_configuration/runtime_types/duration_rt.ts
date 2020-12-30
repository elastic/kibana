/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import * as t from 'io-ts';
import { either } from 'fp-ts/lib/Either';
import moment, { unitOfTime } from 'moment';
import { amountAndUnitToObject, AmountAndUnit } from '../amount_and_unit';
import { getRangeTypeMessage } from './get_range_type_message';

function toMilliseconds({ amount, unit }: AmountAndUnit) {
  return moment.duration(amount, unit as unitOfTime.Base);
}

function amountAndUnitToMilliseconds(value?: string) {
  if (value) {
    const { amount, unit } = amountAndUnitToObject(value);
    if (isFinite(amount) && unit) {
      return toMilliseconds({ amount, unit });
    }
  }
}

export function getDurationRt({ min, max }: { min?: string; max?: string }) {
  const minAsMilliseconds = amountAndUnitToMilliseconds(min) ?? -Infinity;
  const maxAsMilliseconds = amountAndUnitToMilliseconds(max) ?? Infinity;
  const message = getRangeTypeMessage(min, max);

  return new t.Type<string, string, unknown>(
    'durationRt',
    t.string.is,
    (input, context) => {
      return either.chain(
        t.string.validate(input, context),
        (inputAsString) => {
          const inputAsMilliseconds = amountAndUnitToMilliseconds(
            inputAsString
          );

          const isValidAmount =
            inputAsMilliseconds !== undefined &&
            inputAsMilliseconds >= minAsMilliseconds &&
            inputAsMilliseconds <= maxAsMilliseconds;

          return isValidAmount
            ? t.success(inputAsString)
            : t.failure(input, context, message);
        }
      );
    },
    t.identity
  );
}
