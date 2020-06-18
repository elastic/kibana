/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import * as t from 'io-ts';
import { Either } from 'fp-ts/lib/Either';

import { CommentsNewArray, commentsNew } from './comments_new';

export type DefaultCommentsNewArrayC = t.Type<CommentsNewArray, CommentsNewArray, unknown>;

/**
 * Types the DefaultCommentsNew as:
 *   - If null or undefined, then a default array of type entry will be set
 */
export const DefaultCommentsNewArray: DefaultCommentsNewArrayC = new t.Type<
  CommentsNewArray,
  CommentsNewArray,
  unknown
>(
  'DefaultCommentsNew',
  t.array(commentsNew).is,
  (input): Either<t.Errors, CommentsNewArray> =>
    input == null ? t.success([]) : t.array(commentsNew).decode(input),
  t.identity
);
