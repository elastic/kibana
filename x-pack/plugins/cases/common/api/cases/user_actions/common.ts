/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as rt from 'io-ts';
import { OWNER_FIELD } from '../constants';
import { UserRT } from '../../user';

export const Fields = {
  comment: 'comment',
  connector: 'connector',
  description: 'description',
  pushed: 'pushed',
  tags: 'tags',
  title: 'title',
  status: 'status',
  settings: 'settings',
  owner: OWNER_FIELD,
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
export const FieldTypeRt = rt.keyof(Fields);
export const FieldsRt = rt.array(FieldTypeRt);
export const ActionsRt = rt.keyof(Actions);

export const UserActionCommonAttributesRt = rt.type({
  created_at: rt.string,
  created_by: UserRT,
  owner: rt.string,
});
