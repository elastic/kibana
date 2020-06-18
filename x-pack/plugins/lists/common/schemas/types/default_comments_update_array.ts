/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import * as t from 'io-ts';
import { Either } from 'fp-ts/lib/Either';

import { CommentsUpdateArray, commentsUpdateArray } from './comments_update';

export type DefaultCommentsUpdateArrayC = t.Type<CommentsUpdateArray, CommentsUpdateArray, unknown>;

/**
 * Types the DefaultCommentsUpdate as:
 *   - If null or undefined, then a default array of type entry will be set
 */
export const DefaultCommentsUpdateArray: DefaultCommentsUpdateArrayC = new t.Type<
  CommentsUpdateArray,
  CommentsUpdateArray,
  unknown
>(
  'DefaultCreateComments',
  commentsUpdateArray.is,
  (input): Either<t.Errors, CommentsUpdateArray> =>
    input == null ? t.success([]) : commentsUpdateArray.decode(input),
  t.identity
);
