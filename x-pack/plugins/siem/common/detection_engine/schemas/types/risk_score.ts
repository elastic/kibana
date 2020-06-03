/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import * as t from 'io-ts';
import { Either } from 'fp-ts/lib/Either';

export type RiskScoreC = t.Type<number, number, unknown>;

/**
 * Types the risk score as:
 *   - Natural Number (positive integer and not a float),
 *   - Between the values [0 and 100] inclusive.
 */
export const RiskScore: RiskScoreC = new t.Type<number, number, unknown>(
  'RiskScore',
  t.number.is,
  (input, context): Either<t.Errors, number> => {
    // TODO: This is only for backwards compatibility with the UI. Once the UI is fixed to not send strings then this can be just a number again.
    const converted = typeof input === 'string' ? parseInt(input, 10) : input;
    if (typeof converted === 'number' && isNaN(converted)) {
      return t.failure(input, context);
    } else {
      return typeof converted === 'number' &&
        Number.isSafeInteger(converted) &&
        converted >= 0 &&
        converted <= 100
        ? t.success(converted)
        : t.failure(converted, context);
    }
  },
  t.identity
);
