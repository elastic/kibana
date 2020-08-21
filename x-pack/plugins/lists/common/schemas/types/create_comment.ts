/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import * as t from 'io-ts';

import { NonEmptyString } from '../../shared_imports';

export const createComment = t.exact(
  t.type({
    comment: NonEmptyString,
  })
);

export type CreateComment = t.TypeOf<typeof createComment>;
export const createCommentsArray = t.array(createComment);
export type CreateCommentsArray = t.TypeOf<typeof createCommentsArray>;
export type CreateComments = t.TypeOf<typeof createComment>;
export const createCommentsArrayOrUndefined = t.union([createCommentsArray, t.undefined]);
export type CreateCommentsArrayOrUndefined = t.TypeOf<typeof createCommentsArrayOrUndefined>;
