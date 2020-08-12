/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import * as t from 'io-ts';
import { Either } from 'fp-ts/lib/Either';
import { max_signals } from '../common/schemas';
import { DEFAULT_MAX_SIGNALS } from '../../../constants';

/**
 * Types the default max signal:
 *   - Natural Number (positive integer and not a float),
 *   - greater than 1
 *   - If undefined then it will use DEFAULT_MAX_SIGNALS (100) as the default
 */
export const DefaultMaxSignalsNumber = new t.Type<number, number | undefined, unknown>(
  'DefaultMaxSignals',
  t.number.is,
  (input, context): Either<t.Errors, number> => {
    return input == null ? t.success(DEFAULT_MAX_SIGNALS) : max_signals.validate(input, context);
  },
  t.identity
);
