/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as rt from 'io-ts';
import { OWNER_FIELD } from './constants';

import { UserRT } from '../user';

/* To the next developer, if you add/removed fields here
 * make sure to check this file (x-pack/plugins/cases/server/services/user_actions/helpers.ts) too
 */
const UserActionFieldTypeRt = rt.union([
  rt.literal('comment'),
  rt.literal('connector'),
  rt.literal('description'),
  rt.literal('pushed'),
  rt.literal('tags'),
  rt.literal('title'),
  rt.literal('status'),
  rt.literal('settings'),
  rt.literal('sub_case'),
  rt.literal(OWNER_FIELD),
]);
const UserActionFieldRt = rt.array(UserActionFieldTypeRt);
const UserActionRt = rt.union([
  rt.literal('add'),
  rt.literal('create'),
  rt.literal('delete'),
  rt.literal('update'),
  rt.literal('push-to-service'),
]);

const CaseUserActionBasicRT = rt.type({
  action_field: UserActionFieldRt,
  action: UserActionRt,
  action_at: rt.string,
  action_by: UserRT,
  new_value: rt.union([rt.string, rt.null]),
  old_value: rt.union([rt.string, rt.null]),
  owner: rt.string,
});

const CaseUserActionResponseRT = rt.intersection([
  CaseUserActionBasicRT,
  rt.type({
    action_id: rt.string,
    case_id: rt.string,
    comment_id: rt.union([rt.string, rt.null]),
    new_val_connector_id: rt.union([rt.string, rt.null]),
    old_val_connector_id: rt.union([rt.string, rt.null]),
  }),
  rt.partial({ sub_case_id: rt.string }),
]);

export const CaseUserActionAttributesRt = CaseUserActionBasicRT;

export const CaseUserActionsResponseRt = rt.array(CaseUserActionResponseRT);

export type CaseUserActionAttributes = rt.TypeOf<typeof CaseUserActionAttributesRt>;
export type CaseUserActionsResponse = rt.TypeOf<typeof CaseUserActionsResponseRt>;
export type CaseUserActionResponse = rt.TypeOf<typeof CaseUserActionResponseRT>;

export type UserAction = rt.TypeOf<typeof UserActionRt>;
export type UserActionField = rt.TypeOf<typeof UserActionFieldRt>;
export type UserActionFieldType = rt.TypeOf<typeof UserActionFieldTypeRt>;
