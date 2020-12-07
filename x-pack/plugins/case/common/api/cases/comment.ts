/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import * as rt from 'io-ts';

import { UserRT } from '../user';

export const CommentAttributesBasicRt = rt.type({
  created_at: rt.string,
  created_by: UserRT,
  pushed_at: rt.union([rt.string, rt.null]),
  pushed_by: rt.union([UserRT, rt.null]),
  updated_at: rt.union([rt.string, rt.null]),
  updated_by: rt.union([UserRT, rt.null]),
});

export const ContextTypeUserRt = rt.type({
  comment: rt.string,
  type: rt.literal('user'),
});

export const ContextTypeAlertRt = rt.type({
  type: rt.literal('alert'),
  alertId: rt.string,
  index: rt.string,
});

const AttributesTypeUserRt = rt.intersection([ContextTypeUserRt, CommentAttributesBasicRt]);
const AttributesTypeAlertsRt = rt.intersection([ContextTypeAlertRt, CommentAttributesBasicRt]);
const CommentAttributesRt = rt.union([AttributesTypeUserRt, AttributesTypeAlertsRt]);

const ContextBasicRt = rt.union([ContextTypeUserRt, ContextTypeAlertRt]);

export const CommentRequestRt = ContextBasicRt;

export const CommentResponseRt = rt.intersection([
  CommentAttributesRt,
  rt.type({
    id: rt.string,
    version: rt.string,
  }),
]);

export const AllCommentsResponseRT = rt.array(CommentResponseRt);

export const CommentPatchRequestRt = rt.intersection([
  /**
   * Partial updates are not allowed.
   * We want to prevent the user for changing the type without removing invalid fields.
   */
  ContextBasicRt,
  rt.type({ id: rt.string, version: rt.string }),
]);

/**
 * This type is used by the CaseService.
 * Because the type for the attributes of savedObjectClient update function is Partial<T>
 * we need to make all of our attributes partial too.
 * We ensure that partial updates of CommentContext is not going to happen inside the patch comment route.
 */
export const CommentPatchAttributesRt = rt.intersection([
  rt.union([rt.partial(CommentAttributesBasicRt.props), rt.partial(ContextTypeAlertRt.props)]),
  rt.partial(CommentAttributesBasicRt.props),
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
export type CommentPatchAttributes = rt.TypeOf<typeof CommentPatchAttributesRt>;
export type CommentRequestUserType = rt.TypeOf<typeof ContextTypeUserRt>;
export type CommentRequestAlertType = rt.TypeOf<typeof ContextTypeAlertRt>;
