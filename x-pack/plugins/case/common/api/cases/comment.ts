/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import * as rt from 'io-ts';

import { UserRT } from '../user';

const CommentBasicRt = rt.type({
  comment: rt.string,
  type: rt.union([rt.literal('alert'), rt.literal('user')]),
});

export const CommentAttributesRt = rt.intersection([
  CommentBasicRt,
  rt.type({
    created_at: rt.string,
    created_by: UserRT,
    pushed_at: rt.union([rt.string, rt.null]),
    pushed_by: rt.union([UserRT, rt.null]),
    updated_at: rt.union([rt.string, rt.null]),
    updated_by: rt.union([UserRT, rt.null]),
  }),
]);

export const CommentRequestRt = CommentBasicRt;

export const CommentResponseRt = rt.intersection([
  CommentAttributesRt,
  rt.type({
    id: rt.string,
    version: rt.string,
  }),
]);

export const AllCommentsResponseRT = rt.array(CommentResponseRt);

export const CommentPatchRequestRt = rt.intersection([
  rt.partial(CommentBasicRt.props),
  rt.type({ id: rt.string, version: rt.string }),
]);

export const CommentsResponseRt = rt.type({
  comments: rt.array(CommentResponseRt),
  page: rt.number,
  per_page: rt.number,
  total: rt.number,
});

export enum CommentType {
  user = 'user',
  alert = 'alert',
}

export const AllCommentsResponseRt = rt.array(CommentResponseRt);

export type CommentAttributes = rt.TypeOf<typeof CommentAttributesRt>;
export type CommentRequest = rt.TypeOf<typeof CommentRequestRt>;
export type CommentResponse = rt.TypeOf<typeof CommentResponseRt>;
export type AllCommentsResponse = rt.TypeOf<typeof AllCommentsResponseRt>;
export type CommentsResponse = rt.TypeOf<typeof CommentsResponseRt>;
export type CommentPatchRequest = rt.TypeOf<typeof CommentPatchRequestRt>;
