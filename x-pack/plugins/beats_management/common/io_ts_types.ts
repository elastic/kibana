/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import * as t from 'io-ts';
import { isRight } from 'fp-ts/lib/Either';

class DateFromStringType extends t.Type<Date, string, t.mixed> {
  public readonly _tag: 'DateFromISOStringType' = 'DateFromISOStringType';
  constructor() {
    super(
      'DateFromString',
      (u): u is Date => u instanceof Date,
      (u, c) => {
        const validation = t.string.validate(u, c);
        if (!isRight(validation)) {
          return validation as any;
        } else {
          const s = validation.right;
          const d = new Date(s);
          return isNaN(d.getTime()) ? t.failure(s, c) : t.success(d);
        }
      },
      (a) => a.toISOString()
    );
  }
}
// eslint-disable-next-line
export interface DateFromString extends DateFromStringType {}

export const DateFromString: DateFromString = new DateFromStringType();
