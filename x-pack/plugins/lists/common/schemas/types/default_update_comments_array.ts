/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import * as t from 'io-ts';
import { Either } from 'fp-ts/lib/Either';

import { UpdateCommentsArray, updateCommentsArray } from './update_comments';

export type DefaultUpdateCommentsArrayC = t.Type<UpdateCommentsArray, UpdateCommentsArray, unknown>;

/**
 * Types the DefaultCommentsUpdate as:
 *   - If null or undefined, then a default array of type entry will be set
 */
export const DefaultUpdateCommentsArray: DefaultUpdateCommentsArrayC = new t.Type<
  UpdateCommentsArray,
  UpdateCommentsArray,
  unknown
>(
  'DefaultCreateComments',
  updateCommentsArray.is,
  (input): Either<t.Errors, UpdateCommentsArray> =>
    input == null ? t.success([]) : updateCommentsArray.decode(input),
  t.identity
);
