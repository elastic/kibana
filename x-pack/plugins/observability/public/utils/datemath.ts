/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import dateMath from '@kbn/datemath';
import { chain } from 'fp-ts/Either';
import { pipe } from 'fp-ts/pipeable';
import * as r from 'io-ts';

// Copied from x-pack/plugins/infra/public/utils/datemath.ts
export function isValidDatemath(value: string): boolean {
  const parsedValue = dateMath.parse(value);
  return !!(parsedValue && parsedValue.isValid());
}

export const datemathStringRT = new r.Type<string, string, unknown>(
  'datemath',
  r.string.is,
  (value, context) =>
    pipe(
      r.string.validate(value, context),
      chain((stringValue) =>
        isValidDatemath(stringValue) ? r.success(stringValue) : r.failure(stringValue, context)
      )
    ),
  String
);
