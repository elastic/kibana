/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { User } from '../user';

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
type ActionTypeValues = typeof ActionTypes[ActionTypeKeys];

const ActionsDefinition = {
  add: 'add',
  create: 'create',
  delete: 'delete',
  update: 'update',
  push_to_service: 'push_to_service',
} as const;

type Action = keyof typeof ActionsDefinition;

export interface UserActionCommonPersistedAttributes {
  action: Action;
  created_at: string;
  created_by: User;
  owner: string;
}

/**
 * This interface is generally unsafe because it only requires a payload of Record<string, unknown>. Only use this
 * this interface if you absolutely have to.
 */
export interface UnsafeUserActionPersistedAttributes extends UserActionCommonPersistedAttributes {
  type: ActionTypeValues;
  payload: Record<string, unknown>;
}
