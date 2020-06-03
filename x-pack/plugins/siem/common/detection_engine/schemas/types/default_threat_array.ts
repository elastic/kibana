/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import * as t from 'io-ts';
import { Either } from 'fp-ts/lib/Either';
import { Threat, threat } from '../common/schemas';

export type DefaultThreatArrayC = t.Type<Threat, Threat, unknown>;

/**
 * Types the DefaultThreatArray as:
 *   - If null or undefined, then an empty array will be set
 */
export const DefaultThreatArray: DefaultThreatArrayC = new t.Type<Threat, Threat, unknown>(
  'DefaultThreatArray',
  threat.is,
  (input): Either<t.Errors, Threat> => (input == null ? t.success([]) : threat.decode(input)),
  t.identity
);
