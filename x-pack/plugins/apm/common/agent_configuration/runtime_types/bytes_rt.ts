/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import * as t from 'io-ts';
import { either } from 'fp-ts/lib/Either';
import { amountAndUnitToObject } from '../amount_and_unit';
import { getRangeTypeMessage } from './get_range_type_message';

function toBytes(amount: number, unit: string) {
  switch (unit) {
    case 'b':
      return amount;
    case 'kb':
      return amount * 2 ** 10;
    case 'mb':
      return amount * 2 ** 20;
  }
}

function amountAndUnitToBytes(value?: string): number | undefined {
  if (value) {
    const { amount, unit } = amountAndUnitToObject(value);
    if (isFinite(amount) && unit) {
      return toBytes(amount, unit);
    }
  }
}

export function getBytesRt({ min, max }: { min?: string; max?: string }) {
  const minAsBytes = amountAndUnitToBytes(min) ?? -Infinity;
  const maxAsBytes = amountAndUnitToBytes(max) ?? Infinity;
  const message = getRangeTypeMessage(min, max);

  return new t.Type<string, string, unknown>(
    'bytesRt',
    t.string.is,
    (input, context) => {
      return either.chain(
        t.string.validate(input, context),
        (inputAsString) => {
          const inputAsBytes = amountAndUnitToBytes(inputAsString);

          const isValidAmount =
            inputAsBytes !== undefined &&
            inputAsBytes >= minAsBytes &&
            inputAsBytes <= maxAsBytes;

          return isValidAmount
            ? t.success(inputAsString)
            : t.failure(input, context, message);
        }
      );
    },
    t.identity
  );
}
