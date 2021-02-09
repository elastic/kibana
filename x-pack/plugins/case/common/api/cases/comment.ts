/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as rt from 'io-ts';

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
  pushed_at: rt.union([rt.string, rt.null]),
  pushed_by: rt.union([UserRT, rt.null]),
  updated_at: rt.union([rt.string, rt.null]),
  updated_by: rt.union([UserRT, rt.null]),
});

export enum CommentType {
  user = 'user',
  alert = 'alert',
  generatedAlert = 'generated_alert',
}

export const ContextTypeUserRt = rt.type({
  comment: rt.string,
  type: rt.literal(CommentType.user),
});

export const ContextTypeAlertRt = rt.type({
  type: rt.union([rt.literal(CommentType.generatedAlert), rt.literal(CommentType.alert)]),
  alertId: rt.union([rt.array(rt.string), rt.string]),
  index: rt.string,
});

const AlertIDRt = rt.type({
  _id: rt.string,
});

export const ContextTypeGeneratedAlertRt = rt.type({
  type: rt.literal(CommentType.generatedAlert),
  alerts: rt.union([rt.array(AlertIDRt), AlertIDRt]),
  index: rt.string,
});

const AttributesTypeUserRt = rt.intersection([ContextTypeUserRt, CommentAttributesBasicRt]);
const AttributesTypeAlertsRt = rt.intersection([ContextTypeAlertRt, CommentAttributesBasicRt]);
const CommentAttributesRt = rt.union([AttributesTypeUserRt, AttributesTypeAlertsRt]);

const ContextBasicRt = rt.union([
  ContextTypeUserRt,
  ContextTypeAlertRt,
  ContextTypeGeneratedAlertRt,
]);

export const CommentRequestRt = ContextBasicRt;

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

export const AllCommentsResponseRT = rt.array(CommentResponseRt);

export const CommentPatchRequestRt = rt.intersection([
  /**
   * Partial updates are not allowed.
   * We want to prevent the user for changing the type without removing invalid fields.
   */
  rt.union([ContextTypeUserRt, ContextTypeAlertRt]),
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

export const AllCommentsResponseRt = rt.array(CommentResponseRt);

export type AttributesTypeAlerts = rt.TypeOf<typeof AttributesTypeAlertsRt>;
export type CommentAttributes = rt.TypeOf<typeof CommentAttributesRt>;
export type CommentRequest = rt.TypeOf<typeof CommentRequestRt>;
export type CommentResponse = rt.TypeOf<typeof CommentResponseRt>;
export type CommentResponseAlertsType = rt.TypeOf<typeof CommentResponseTypeAlertsRt>;
export type AllCommentsResponse = rt.TypeOf<typeof AllCommentsResponseRt>;
export type CommentsResponse = rt.TypeOf<typeof CommentsResponseRt>;
export type CommentPatchRequest = rt.TypeOf<typeof CommentPatchRequestRt>;
export type CommentPatchAttributes = rt.TypeOf<typeof CommentPatchAttributesRt>;
export type CommentRequestUserType = rt.TypeOf<typeof ContextTypeUserRt>;
export type CommentRequestAlertType = rt.TypeOf<typeof ContextTypeAlertRt>;

/**
 * This type represents a generated alert (or alerts) from a rule. The difference between this and a user alert
 * is that this format expects the included alerts to have the structure { _id: string }. When it is saved the outer
 * object will be stripped off and the _id will be stored in the alertId field.
 */
export type CommentRequestGeneratedAlertType = rt.TypeOf<typeof ContextTypeGeneratedAlertRt>;
