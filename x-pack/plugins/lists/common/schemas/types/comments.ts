/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import * as t from 'io-ts';

export const comments = t.intersection([
  t.exact(
    t.type({
      comment: t.string,
      created_at: t.string, // TODO: Make this into an ISO Date string check,
      created_by: t.string,
    })
  ),
  t.exact(
    t.partial({
      updated_at: t.string,
      updated_by: t.string,
    })
  ),
]);

export const commentsArray = t.array(comments);
export type CommentsArray = t.TypeOf<typeof commentsArray>;
export type Comments = t.TypeOf<typeof comments>;
export const commentsArrayOrUndefined = t.union([commentsArray, t.undefined]);
export type CommentsArrayOrUndefined = t.TypeOf<typeof commentsArrayOrUndefined>;
