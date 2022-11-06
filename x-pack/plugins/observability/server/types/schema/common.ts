/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { either } from 'fp-ts/lib/Either';
import * as t from 'io-ts';

const ALL_VALUE = '*';

const allOrAnyString = t.union([t.literal(ALL_VALUE), t.string]);

const dateType = new t.Type<Date, string, unknown>(
  'DateType',
  (input: unknown): input is Date => input instanceof Date,
  (input: unknown, context: t.Context) =>
    either.chain(t.string.validate(input, context), (value: string) => {
      const decoded = new Date(value);
      return isNaN(decoded.getTime()) ? t.failure(input, context) : t.success(decoded);
    }),
  (date: Date): string => date.toISOString()
);

const errorBudgetSchema = t.type({
  initial: t.number,
  consumed: t.number,
  remaining: t.number,
});

const dateRangeSchema = t.type({ from: dateType, to: dateType });

export { allOrAnyString, ALL_VALUE, dateType, errorBudgetSchema, dateRangeSchema };
