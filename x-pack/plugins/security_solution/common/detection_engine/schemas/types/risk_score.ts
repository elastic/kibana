/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import * as t from 'io-ts';
import { Either } from 'fp-ts/lib/Either';

/**
 * Types the risk score as:
 *   - Natural Number (positive integer and not a float),
 *   - Between the values [0 and 100] inclusive.
 */
export const RiskScore = new t.Type<number, number, unknown>(
  'RiskScore',
  t.number.is,
  (input, context): Either<t.Errors, number> => {
    return typeof input === 'number' && Number.isSafeInteger(input) && input >= 0 && input <= 100
      ? t.success(input)
      : t.failure(input, context);
  },
  t.identity
);

export type RiskScoreC = typeof RiskScore;
