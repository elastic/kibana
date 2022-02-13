/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as rt from 'io-ts';
import { UserRT } from '../../user';

export const ActionTypes = {
  comment: 'comment',
  connector: 'connector',
  description: 'description',
  pushed: 'pushed',
  tags: 'tags',
  title: 'title',
  status: 'status',
  settings: 'settings',
  create_case: 'create_case',
  delete_case: 'delete_case',
} as const;

export const Actions = {
  add: 'add',
  create: 'create',
  delete: 'delete',
  update: 'update',
  push_to_service: 'push_to_service',
} as const;

/* To the next developer, if you add/removed fields here
 * make sure to check this file (x-pack/plugins/cases/server/services/user_actions/helpers.ts) too
 */
export const ActionTypesRt = rt.keyof(ActionTypes);
export const ActionsRt = rt.keyof(Actions);

export const UserActionCommonAttributesRt = rt.type({
  created_at: rt.string,
  created_by: UserRT,
  owner: rt.string,
  action: ActionsRt,
});

export const CaseUserActionSavedObjectIdsRt = rt.type({
  action_id: rt.string,
  case_id: rt.string,
  comment_id: rt.union([rt.string, rt.null]),
});

export type UserActionWithAttributes<T> = T & rt.TypeOf<typeof UserActionCommonAttributesRt>;
export type UserActionWithResponse<T> = T & rt.TypeOf<typeof CaseUserActionSavedObjectIdsRt>;
