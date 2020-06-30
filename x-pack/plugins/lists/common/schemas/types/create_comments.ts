/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import * as t from 'io-ts';

export const createComments = t.exact(
  t.type({
    comment: t.string,
  })
);

export const createCommentsArray = t.array(createComments);
export type CreateCommentsArray = t.TypeOf<typeof createCommentsArray>;
export type CreateComments = t.TypeOf<typeof createComments>;
export const createCommentsArrayOrUndefined = t.union([createCommentsArray, t.undefined]);
export type CreateCommentsArrayOrUndefined = t.TypeOf<typeof createCommentsArrayOrUndefined>;
