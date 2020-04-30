/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import * as t from 'io-ts';
import { either } from 'fp-ts/lib/Either';
import { i18n } from '@kbn/i18n';
import { amountAndUnitToObject } from '../amount_and_unit';
import { getRangeType } from './get_range_type';

function toBytes(amount: number, unit: string) {
  switch (unit) {
    case 'kb':
      return amount * 2 ** 10;
    case 'mb':
      return amount * 2 ** 20;
    case 'b':
    default:
      return amount;
  }
}

export function getBytesRt({
  min,
  max,
  units
}: {
  min?: string;
  max?: string;
  units: string[];
}) {
  const { amount: minAmount, unit: minUnit } = min
    ? amountAndUnitToObject(min)
    : { amount: -Infinity, unit: 'b' };

  const { amount: maxAmount, unit: maxUnit } = max
    ? amountAndUnitToObject(max)
    : { amount: Infinity, unit: 'mb' };

  const message = i18n.translate('xpack.apm.agentConfig.bytes.errorText', {
    defaultMessage: `{rangeType, select,
        between {Must be between {min} and {max} with unit: {units}}
        gt {Must be greater than {min} with unit: {units}}
        lt {Must be less than {max} with unit: {units}}
        other {Must be an integer with unit: {units}}
      }`,
    values: {
      min,
      max,
      units: units.join(', '),
      rangeType: getRangeType(minAmount, maxAmount)
    }
  });

  return new t.Type<string, string, unknown>(
    'bytesRt',
    t.string.is,
    (input, context) => {
      return either.chain(t.string.validate(input, context), inputAsString => {
        const { amount, unit } = amountAndUnitToObject(inputAsString);
        const isValidUnit = units.includes(unit);

        const inputAsBytes = toBytes(amount, unit);
        const minAsBytes = toBytes(minAmount, minUnit);
        const maxAsBytes = toBytes(maxAmount, maxUnit);

        const isValidAmount =
          inputAsBytes >= minAsBytes && inputAsBytes <= maxAsBytes;

        return isValidUnit && isValidAmount
          ? t.success(inputAsString)
          : t.failure(input, context, message);
      });
    },
    t.identity
  );
}
