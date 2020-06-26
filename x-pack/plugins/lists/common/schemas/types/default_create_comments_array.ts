/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import * as t from 'io-ts';
import { Either } from 'fp-ts/lib/Either';

import { CreateCommentsArray, createComments } from './create_comments';

export type DefaultCreateCommentsArrayC = t.Type<CreateCommentsArray, CreateCommentsArray, unknown>;

/**
 * Types the DefaultCreateComments as:
 *   - If null or undefined, then a default array of type entry will be set
 */
export const DefaultCreateCommentsArray: DefaultCreateCommentsArrayC = new t.Type<
  CreateCommentsArray,
  CreateCommentsArray,
  unknown
>(
  'DefaultCreateComments',
  t.array(createComments).is,
  (input): Either<t.Errors, CreateCommentsArray> =>
    input == null ? t.success([]) : t.array(createComments).decode(input),
  t.identity
);
