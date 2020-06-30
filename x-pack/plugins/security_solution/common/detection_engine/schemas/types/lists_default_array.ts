/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import * as t from 'io-ts';
import { Either } from 'fp-ts/lib/Either';

import { ListArray, list } from './lists';

export type DefaultListArrayC = t.Type<ListArray, ListArray, unknown>;

/**
 * Types the DefaultListArray as:
 *   - If null or undefined, then a default array of type list will be set
 */
export const DefaultListArray: DefaultListArrayC = new t.Type<ListArray, ListArray, unknown>(
  'DefaultListArray',
  t.array(list).is,
  (input, context): Either<t.Errors, ListArray> =>
    input == null ? t.success([]) : t.array(list).validate(input, context),
  t.identity
);
