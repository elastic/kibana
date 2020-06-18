/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import * as t from 'io-ts';

export const commentsNew = t.exact(
  t.type({
    comment: t.string,
  })
);

export const commentsNewArray = t.array(commentsNew);
export type CommentsNewArray = t.TypeOf<typeof commentsNewArray>;
export type CommentsNew = t.TypeOf<typeof commentsNew>;
export const commentsNewArrayOrUndefined = t.union([commentsNewArray, t.undefined]);
export type CommentsNewArrayOrUndefined = t.TypeOf<typeof commentsNewArrayOrUndefined>;
