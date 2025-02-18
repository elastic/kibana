/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as t from 'io-ts';
import { either } from 'fp-ts/lib/Either';
import { amountAndUnitToObject } from '../amount_and_unit';
import { getRangeTypeMessage } from './get_range_type_message';
import { isFiniteNumber } from '../../utils/is_finite_number';

const units = ['B', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB'];

function toBytes(amount: number, unit: string, decimalUnitBase?: boolean) {
  const base = decimalUnitBase ? 1000 : 1024;
  const unitExponent = unit ? units.indexOf(unit.toUpperCase()) : 0;
  if (unitExponent < 0) {
    return;
  }
  return amount * base ** unitExponent;
}

function amountAndUnitToBytes({
  value,
  decimalUnitBase,
}: {
  value?: string;
  decimalUnitBase?: boolean;
}): number | undefined {
  if (value) {
    const { amount, unit } = amountAndUnitToObject(value);
    if (isFiniteNumber(amount) && unit) {
      return toBytes(amount, unit, decimalUnitBase);
    }
  }
}

export function getStorageSizeRt({ min, max }: { min?: string; max?: string }) {
  const minAsBytes = amountAndUnitToBytes({ value: min, decimalUnitBase: true }) ?? -Infinity;
  const maxAsBytes = amountAndUnitToBytes({ value: max, decimalUnitBase: true }) ?? Infinity;
  const message = getRangeTypeMessage(min, max);

  return new t.Type<string, string, unknown>(
    'storageSizeRt',
    t.string.is,
    (input, context) => {
      return either.chain(t.string.validate(input, context), (inputAsString) => {
        const inputAsBytes = amountAndUnitToBytes({
          value: inputAsString,
          decimalUnitBase: true,
        });

        const isValidAmount =
          inputAsBytes !== undefined && inputAsBytes >= minAsBytes && inputAsBytes <= maxAsBytes;

        return isValidAmount ? t.success(inputAsString) : t.failure(input, context, message);
      });
    },
    t.identity
  );
}
