/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import * as rt from 'io-ts';

import { UserRT } from '../user';

/* To the next developer, if you add/removed fields here
 * make sure to check this file (x-pack/plugins/case/server/services/user_actions/helpers.ts) too
 */
const UserActionFieldRt = rt.array(
  rt.union([
    rt.literal('comment'),
    rt.literal('connector'),
    rt.literal('description'),
    rt.literal('pushed'),
    rt.literal('tags'),
    rt.literal('title'),
    rt.literal('status'),
  ])
);
const UserActionRt = rt.union([
  rt.literal('add'),
  rt.literal('create'),
  rt.literal('delete'),
  rt.literal('update'),
  rt.literal('push-to-service'),
]);

// TO DO change state to status
const CaseUserActionBasicRT = rt.type({
  action_field: UserActionFieldRt,
  action: UserActionRt,
  action_at: rt.string,
  action_by: UserRT,
  new_value: rt.union([rt.string, rt.null]),
  old_value: rt.union([rt.string, rt.null]),
});

const CaseUserActionResponseRT = rt.intersection([
  CaseUserActionBasicRT,
  rt.type({
    action_id: rt.string,
    case_id: rt.string,
    comment_id: rt.union([rt.string, rt.null]),
  }),
]);

export const CaseUserActionAttributesRt = CaseUserActionBasicRT;

export const CaseUserActionsResponseRt = rt.array(CaseUserActionResponseRT);

export type CaseUserActionAttributes = rt.TypeOf<typeof CaseUserActionAttributesRt>;
export type CaseUserActionsResponse = rt.TypeOf<typeof CaseUserActionsResponseRt>;

export type UserAction = rt.TypeOf<typeof UserActionRt>;
export type UserActionField = rt.TypeOf<typeof UserActionFieldRt>;
