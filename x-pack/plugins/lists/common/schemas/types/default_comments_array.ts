/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import * as t from 'io-ts';
import { Either } from 'fp-ts/lib/Either';

import { CommentsArray, comment } from './comment';

/**
 * Types the DefaultCommentsArray as:
 *   - If null or undefined, then a default array of type entry will be set
 */
export const DefaultCommentsArray = new t.Type<CommentsArray, CommentsArray, unknown>(
  'DefaultCommentsArray',
  t.array(comment).is,
  (input): Either<t.Errors, CommentsArray> =>
    input == null ? t.success([]) : t.array(comment).decode(input),
  t.identity
);
