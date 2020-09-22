/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import * as t from 'io-ts';
import { Either } from 'fp-ts/lib/Either';

/**
 * Types the DefaultArray<C> as:
 *   - If undefined, then a default array will be set
 *   - If an array is sent in, then the array will be validated to ensure all elements are type C
 */
export const DefaultArray = <C extends t.Mixed>(codec: C) =>
  new t.Type<C[], C[] | undefined, unknown>(
    'DefaultArray',
    t.array(codec).is,
    (input, context): Either<t.Errors, T[]> =>
      input == null ? t.success([]) : t.array(codec).validate(input, context),
    t.identity
  );
