/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import * as t from 'io-ts';
import { Either } from 'fp-ts/lib/Either';

import { CommentsArray, CommentsPartialArray, comment, commentPartial } from './comments';

export type DefaultCommentsArrayC = t.Type<CommentsArray, CommentsArray, unknown>;
export type DefaultCommentsPartialArrayC = t.Type<
  CommentsPartialArray,
  CommentsPartialArray,
  unknown
>;

/**
 * Types the DefaultCommentsArray as:
 *   - If null or undefined, then a default array of type entry will be set
 */
export const DefaultCommentsArray: DefaultCommentsArrayC = new t.Type<
  CommentsArray,
  CommentsArray,
  unknown
>(
  'DefaultCommentsArray',
  t.array(comment).is,
  (input, context): Either<t.Errors, CommentsArray> =>
    input == null ? t.success([]) : t.array(comment).validate(input, context),
  t.identity
);

/**
 * Types the DefaultCommentsPartialArray as:
 *   - If null or undefined, then a default array of type entry will be set
 */
export const DefaultCommentsPartialArray: DefaultCommentsPartialArrayC = new t.Type<
  CommentsPartialArray,
  CommentsPartialArray,
  unknown
>(
  'DefaultCommentsPartialArray',
  t.array(commentPartial).is,
  (input, context): Either<t.Errors, CommentsPartialArray> =>
    input == null ? t.success([]) : t.array(commentPartial).validate(input, context),
  t.identity
);
