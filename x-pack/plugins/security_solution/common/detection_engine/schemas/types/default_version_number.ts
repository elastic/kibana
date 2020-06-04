/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import * as t from 'io-ts';
import { Either } from 'fp-ts/lib/Either';
import { version, Version } from '../common/schemas';

export type DefaultVersionNumberC = t.Type<Version, Version, unknown>;

/**
 * Types the DefaultVersionNumber as:
 *   - If null or undefined, then a default of the number 1 will be used
 */
export const DefaultVersionNumber: DefaultVersionNumberC = new t.Type<Version, Version, unknown>(
  'DefaultVersionNumber',
  version.is,
  (input): Either<t.Errors, Version> => (input == null ? t.success(1) : version.decode(input)),
  t.identity
);
