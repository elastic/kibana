/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import * as t from 'io-ts';
import { Either } from 'fp-ts/lib/Either';
import { Threat, threat } from '../common/schemas';

/**
 * Types the DefaultThreatArray as:
 *   - If null or undefined, then an empty array will be set
 */
export const DefaultThreatArray = new t.Type<Threat, Threat, unknown>(
  'DefaultThreatArray',
  threat.is,
  (input, context): Either<t.Errors, Threat> =>
    input == null ? t.success([]) : threat.validate(input, context),
  t.identity
);

export type DefaultThreatArrayC = typeof DefaultThreatArray;
