/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as t from 'io-ts';
import { Either } from 'fp-ts/lib/Either';

/**
 * Types the positive integer are:
 *   - Natural Number (positive integer and not a float),
 *   - zero or greater
 * @deprecated Use packages/kbn-securitysolution-io-ts-utils
 */
export const PositiveInteger = new t.Type<number, number, unknown>(
  'PositiveInteger',
  t.number.is,
  (input, context): Either<t.Errors, number> => {
    return typeof input === 'number' && Number.isSafeInteger(input) && input >= 0
      ? t.success(input)
      : t.failure(input, context);
  },
  t.identity
);
