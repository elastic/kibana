/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import * as t from 'io-ts';
import { Either } from 'fp-ts/lib/Either';
import { ThrottleOrNull, throttle } from '../common/schemas';

/**
 * Types the DefaultThrottleNull as:
 *   - If null or undefined, then a null will be set
 */
export const DefaultThrottleNull = new t.Type<ThrottleOrNull, ThrottleOrNull, unknown>(
  'DefaultThreatNull',
  throttle.is,
  (input, context): Either<t.Errors, ThrottleOrNull> =>
    input == null ? t.success(null) : throttle.validate(input, context),
  t.identity
);

export type DefaultThrottleNullC = typeof DefaultThrottleNull;
