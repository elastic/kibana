/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as t from 'io-ts';
import { Either } from 'fp-ts/lib/Either';
import { version, Version } from '../common/schemas';

/**
 * Types the DefaultVersionNumber as:
 *   - If null or undefined, then a default of the number 1 will be used
 * @deprecated Use packages/kbn-securitysolution-io-ts-utils
 */
export const DefaultVersionNumber = new t.Type<Version, Version | undefined, unknown>(
  'DefaultVersionNumber',
  version.is,
  (input, context): Either<t.Errors, Version> =>
    input == null ? t.success(1) : version.validate(input, context),
  t.identity
);

export type DefaultVersionNumberDecoded = t.TypeOf<typeof DefaultVersionNumber>;
