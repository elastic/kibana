/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as rt from 'io-ts';
import { SavedObjectFindOptionsRt } from '../saved_object';

import { UserRT } from '../user';

export const CommentAttributesBasicRt = rt.type({
  created_at: rt.string,
  created_by: UserRT,
  owner: rt.string,
  pushed_at: rt.union([rt.string, rt.null]),
  pushed_by: rt.union([UserRT, rt.null]),
  updated_at: rt.union([rt.string, rt.null]),
  updated_by: rt.union([UserRT, rt.null]),
});

export enum CommentType {
  user = 'user',
  alert = 'alert',
  actions = 'actions',
}

export enum IsolateHostActionType {
  isolate = 'isolate',
  unisolate = 'unisolate',
}

export const ContextTypeUserRt = rt.type({
  comment: rt.string,
  type: rt.literal(CommentType.user),
  owner: rt.string,
});

/**
 * This defines the structure of how alerts (generated or user attached) are stored in saved objects documents. It also
 * represents of an alert after it has been transformed. A generated alert will be transformed by the connector so that
 * it matches this structure. User attached alerts do not need to be transformed.
 */
export const AlertCommentRequestRt = rt.type({
  type: rt.literal(CommentType.alert),
  alertId: rt.union([rt.array(rt.string), rt.string]),
  index: rt.union([rt.array(rt.string), rt.string]),
  rule: rt.type({
    id: rt.union([rt.string, rt.null]),
    name: rt.union([rt.string, rt.null]),
  }),
  owner: rt.string,
});

export const ActionsCommentRequestRt = rt.type({
  type: rt.literal(CommentType.actions),
  comment: rt.string,
  actions: rt.type({
    targets: rt.array(
      rt.type({
        hostname: rt.string,
        endpointId: rt.string,
      })
    ),
    type: rt.string,
  }),
  owner: rt.string,
});

const AttributesTypeUserRt = rt.intersection([ContextTypeUserRt, CommentAttributesBasicRt]);
const AttributesTypeAlertsRt = rt.intersection([AlertCommentRequestRt, CommentAttributesBasicRt]);
const AttributesTypeActionsRt = rt.intersection([
  ActionsCommentRequestRt,
  CommentAttributesBasicRt,
]);
const CommentAttributesRt = rt.union([
  AttributesTypeUserRt,
  AttributesTypeAlertsRt,
  AttributesTypeActionsRt,
]);

export const CommentRequestRt = rt.union([
  ContextTypeUserRt,
  AlertCommentRequestRt,
  ActionsCommentRequestRt,
]);

export const CommentResponseRt = rt.intersection([
  CommentAttributesRt,
  rt.type({
    id: rt.string,
    version: rt.string,
  }),
]);

export const CommentResponseTypeUserRt = rt.intersection([
  AttributesTypeUserRt,
  rt.type({
    id: rt.string,
    version: rt.string,
  }),
]);

export const CommentResponseTypeAlertsRt = rt.intersection([
  AttributesTypeAlertsRt,
  rt.type({
    id: rt.string,
    version: rt.string,
  }),
]);

export const CommentResponseTypeActionsRt = rt.intersection([
  AttributesTypeActionsRt,
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
  CommentRequestRt,
  rt.type({ id: rt.string, version: rt.string }),
]);

/**
 * This type is used by the CaseService.
 * Because the type for the attributes of savedObjectClient update function is Partial<T>
 * we need to make all of our attributes partial too.
 * We ensure that partial updates of CommentContext is not going to happen inside the patch comment route.
 */
export const CommentPatchAttributesRt = rt.intersection([
  rt.union([rt.partial(CommentAttributesBasicRt.props), rt.partial(AlertCommentRequestRt.props)]),
  rt.partial(CommentAttributesBasicRt.props),
]);

export const CommentsResponseRt = rt.type({
  comments: rt.array(CommentResponseRt),
  page: rt.number,
  per_page: rt.number,
  total: rt.number,
});

export const AllCommentsResponseRt = rt.array(CommentResponseRt);

export const FindQueryParamsRt = rt.partial({
  ...SavedObjectFindOptionsRt.props,
});

export const BulkCreateCommentRequestRt = rt.array(CommentRequestRt);

export type FindQueryParams = rt.TypeOf<typeof FindQueryParamsRt>;
export type AttributesTypeActions = rt.TypeOf<typeof AttributesTypeActionsRt>;
export type AttributesTypeAlerts = rt.TypeOf<typeof AttributesTypeAlertsRt>;
export type AttributesTypeUser = rt.TypeOf<typeof AttributesTypeUserRt>;
export type CommentAttributes = rt.TypeOf<typeof CommentAttributesRt>;
export type CommentRequest = rt.TypeOf<typeof CommentRequestRt>;
export type BulkCreateCommentRequest = rt.TypeOf<typeof BulkCreateCommentRequestRt>;
export type CommentResponse = rt.TypeOf<typeof CommentResponseRt>;
export type CommentResponseUserType = rt.TypeOf<typeof CommentResponseTypeUserRt>;
export type CommentResponseAlertsType = rt.TypeOf<typeof CommentResponseTypeAlertsRt>;
export type CommentResponseActionsType = rt.TypeOf<typeof CommentResponseTypeActionsRt>;
export type AllCommentsResponse = rt.TypeOf<typeof AllCommentsResponseRt>;
export type CommentsResponse = rt.TypeOf<typeof CommentsResponseRt>;
export type CommentPatchRequest = rt.TypeOf<typeof CommentPatchRequestRt>;
export type CommentPatchAttributes = rt.TypeOf<typeof CommentPatchAttributesRt>;
export type CommentRequestUserType = rt.TypeOf<typeof ContextTypeUserRt>;
export type CommentRequestAlertType = rt.TypeOf<typeof AlertCommentRequestRt>;
export type CommentRequestActionsType = rt.TypeOf<typeof ActionsCommentRequestRt>;
