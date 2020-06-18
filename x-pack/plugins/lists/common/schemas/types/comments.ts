/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import * as t from 'io-ts';

export const comment = t.exact(
  t.type({
    comment: t.string,
    created_at: t.string, // TODO: Make this into an ISO Date string check,
    created_by: t.string,
  })
);

export const commentsArray = t.array(comment);
export type CommentsArray = t.TypeOf<typeof commentsArray>;
export type Comment = t.TypeOf<typeof comment>;
export const commentsArrayOrUndefined = t.union([commentsArray, t.undefined]);
export type CommentsArrayOrUndefined = t.TypeOf<typeof commentsArrayOrUndefined>;

export const commentPartial = t.intersection([
  t.exact(
    t.type({
      comment: t.string,
    })
  ),
  t.exact(
    t.partial({
      created_at: t.string, // TODO: Make this into an ISO Date string check,
      created_by: t.string,
    })
  ),
]);

export const commentsPartialArray = t.array(commentPartial);
export type CommentsPartialArray = t.TypeOf<typeof commentsPartialArray>;
export type CommentPartial = t.TypeOf<typeof commentPartial>;
export const commentsPartialArrayOrUndefined = t.union([commentsPartialArray, t.undefined]);
export type CommentsPartialArrayOrUndefined = t.TypeOf<typeof commentsPartialArrayOrUndefined>;
