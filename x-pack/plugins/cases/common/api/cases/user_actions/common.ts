/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as rt from 'io-ts';
import { UserRt } from '../../user';

/**
 * These values are used in a number of places including to define the accepted values in the
 * user_actions/_find api. These values should not be removed only new values can be added.
 */
export const ActionTypes = {
  assignees: 'assignees',
  comment: 'comment',
  connector: 'connector',
  description: 'description',
  pushed: 'pushed',
  tags: 'tags',
  title: 'title',
  status: 'status',
  settings: 'settings',
  severity: 'severity',
  create_case: 'create_case',
  delete_case: 'delete_case',
} as const;

type ActionTypeKeys = keyof typeof ActionTypes;
export type ActionTypeValues = typeof ActionTypes[ActionTypeKeys];

export const Actions = {
  add: 'add',
  create: 'create',
  delete: 'delete',
  update: 'update',
  push_to_service: 'push_to_service',
} as const;

export const ActionsRt = rt.keyof(Actions);

export const UserActionCommonAttributesRt = rt.strict({
  created_at: rt.string,
  created_by: UserRt,
  owner: rt.string,
  action: ActionsRt,
});

/**
 * This should only be used for the getAll route and it should be removed when the route is removed
 * @deprecated use CaseUserActionInjectedIdsRt instead
 */
export const CaseUserActionInjectedDeprecatedIdsRt = rt.strict({
  action_id: rt.string,
  case_id: rt.string,
  comment_id: rt.union([rt.string, rt.null]),
});

export const CaseUserActionInjectedIdsRt = rt.strict({
  comment_id: rt.union([rt.string, rt.null]),
});

export type UserActionWithAttributes<T> = T & rt.TypeOf<typeof UserActionCommonAttributesRt>;
export type UserActionWithResponse<T> = T & { id: string; version: string } & rt.TypeOf<
    typeof CaseUserActionInjectedIdsRt
  >;
export type UserActionWithDeprecatedResponse<T> = T &
  rt.TypeOf<typeof CaseUserActionInjectedDeprecatedIdsRt>;
