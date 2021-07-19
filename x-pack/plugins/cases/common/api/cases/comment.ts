/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as rt from 'io-ts';
import { SavedObjectFindOptionsRt } from '../saved_object';

import { UserRT } from '../user';

/**
 * this is used to differentiate between an alert attached to a top-level case and a group of alerts that should only
 * be attached to a sub case. The reason we need this is because an alert group comment will have references to both a case and
 * sub case when it is created. For us to be able to filter out alert groups in a top-level case we need a field to
 * use as a filter.
 */
export enum AssociationType {
  case = 'case',
  subCase = 'sub_case',
}

export const CommentAttributesBasicRt = rt.type({
  associationType: rt.union([
    rt.literal(AssociationType.case),
    rt.literal(AssociationType.subCase),
  ]),
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
  generatedAlert = 'generated_alert',
  actions = 'actions',
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
  type: rt.union([rt.literal(CommentType.generatedAlert), rt.literal(CommentType.alert)]),
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
  /**
   * If specified the attachments found will be associated to a sub case instead of a case object
   */
  subCaseId: rt.string,
});

export type FindQueryParams = rt.TypeOf<typeof FindQueryParamsRt>;
export type AttributesTypeActions = rt.TypeOf<typeof AttributesTypeActionsRt>;
export type AttributesTypeAlerts = rt.TypeOf<typeof AttributesTypeAlertsRt>;
export type AttributesTypeUser = rt.TypeOf<typeof AttributesTypeUserRt>;
export type CommentAttributes = rt.TypeOf<typeof CommentAttributesRt>;
export type CommentRequest = rt.TypeOf<typeof CommentRequestRt>;
export type CommentResponse = rt.TypeOf<typeof CommentResponseRt>;
export type CommentResponseAlertsType = rt.TypeOf<typeof CommentResponseTypeAlertsRt>;
export type CommentResponseActionsType = rt.TypeOf<typeof CommentResponseTypeActionsRt>;
export type AllCommentsResponse = rt.TypeOf<typeof AllCommentsResponseRt>;
export type CommentsResponse = rt.TypeOf<typeof CommentsResponseRt>;
export type CommentPatchRequest = rt.TypeOf<typeof CommentPatchRequestRt>;
export type CommentPatchAttributes = rt.TypeOf<typeof CommentPatchAttributesRt>;
export type CommentRequestUserType = rt.TypeOf<typeof ContextTypeUserRt>;
export type CommentRequestAlertType = rt.TypeOf<typeof AlertCommentRequestRt>;
export type CommentRequestActionsType = rt.TypeOf<typeof ActionsCommentRequestRt>;
