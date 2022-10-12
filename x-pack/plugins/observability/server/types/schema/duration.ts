/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { either } from 'fp-ts/lib/Either';
import * as t from 'io-ts';

enum DurationUnit {
  'd' = 'd',
  'w' = 'w',
  'M' = 'M',
  'Q' = 'Q',
  'Y' = 'Y',
}

class Duration {
  constructor(public readonly value: number, public readonly unit: DurationUnit) {
    if (isNaN(value) || value <= 0) {
      throw new Error('invalid duration value');
    }
    if (!Object.values(DurationUnit).includes(unit as unknown as DurationUnit)) {
      throw new Error('invalid duration unit');
    }
  }
}

const durationType = new t.Type<Duration, string, unknown>(
  'Duration',
  (input: unknown): input is Duration => input instanceof Duration,
  (input: unknown, context: t.Context) =>
    either.chain(t.string.validate(input, context), (value: string) => {
      try {
        const decoded = new Duration(
          parseInt(value.slice(0, -1), 10),
          value.slice(-1) as DurationUnit
        );
        return t.success(decoded);
      } catch (err) {
        return t.failure(input, context);
      }
    }),
  (duration: Duration): string => `${duration.value}${duration.unit}`
);

export { Duration, DurationUnit, durationType };
