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

export const BYTE_UNITS = ['b', 'kb', 'mb'];

export function getBytesRt({
  min = -Infinity,
  max = Infinity,
  units
}: {
  min?: number;
  max?: number;
  units: string[];
}) {
  const message = i18n.translate('xpack.apm.agentConfig.amount.errorText', {
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
      rangeType: getRangeType(min, max)
    }
  });

  return new t.Type<string, string, unknown>(
    'bytesRt',
    t.string.is,
    (input, context) => {
      return either.chain(t.string.validate(input, context), inputAsString => {
        const { amount, unit } = amountAndUnitToObject(inputAsString);
        const amountAsInt = parseInt(amount, 10);
        const isValidUnit = units.includes(unit);
        const isValid = amountAsInt >= min && amountAsInt <= max && isValidUnit;

        return isValid
          ? t.success(inputAsString)
          : t.failure(input, context, message);
      });
    },
    t.identity
  );
}
