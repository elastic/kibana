/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { schema } from '@kbn/config-schema';
export { CasesConfigurationSchema } from '../../../../actions/server/builtin_action_types/servicenow/schema';

export const UserSchema = schema.object({
  full_name: schema.maybe(schema.string()),
  username: schema.string(),
});

export const NewCommentSchema = schema.object({
  comment: schema.string(),
});

export const UpdateCommentArguments = schema.object({
  comment: schema.string(),
  version: schema.string(),
});

export const CommentSchema = schema.object({
  comment: schema.string(),
  created_at: schema.string(),
  created_by: UserSchema,
  updated_at: schema.string(),
});

export const UpdatedCommentSchema = schema.object({
  comment: schema.string(),
  updated_at: schema.string(),
});

export const NewCaseSchema = schema.object({
  description: schema.string(),
  state: schema.oneOf([schema.literal('open'), schema.literal('closed')], { defaultValue: 'open' }),
  tags: schema.arrayOf(schema.string(), { defaultValue: [] }),
  title: schema.string(),
});

export const UpdatedCaseSchema = schema.object({
  description: schema.maybe(schema.string()),
  state: schema.maybe(schema.oneOf([schema.literal('open'), schema.literal('closed')])),
  tags: schema.maybe(schema.arrayOf(schema.string())),
  title: schema.maybe(schema.string()),
});

export const UpdateCaseArguments = schema.object({
  case: UpdatedCaseSchema,
  version: schema.string(),
});

export const SavedObjectsFindOptionsSchema = schema.object({
  defaultSearchOperator: schema.maybe(schema.oneOf([schema.literal('AND'), schema.literal('OR')])),
  fields: schema.maybe(schema.arrayOf(schema.string())),
  filter: schema.maybe(schema.string()),
  page: schema.maybe(schema.number()),
  perPage: schema.maybe(schema.number()),
  search: schema.maybe(schema.string()),
  searchFields: schema.maybe(schema.arrayOf(schema.string())),
  sortField: schema.maybe(schema.string()),
  sortOrder: schema.maybe(schema.oneOf([schema.literal('desc'), schema.literal('asc')])),
});

export const NewActionSchema = schema.object({
  name: schema.string(),
  actionTypeId: schema.oneOf([schema.literal('.servicenow')]),
  config: schema.object({ apiUrl: schema.uri({ scheme: ['http', 'https'] }) }),
  secrets: schema.object({ username: schema.string(), password: schema.string() }),
});

export const FindActionsSchema = schema.object({
  filter: schema.maybe(schema.string()),
});

export const CheckActionHealthSchema = schema.object({
  apiUrl: schema.uri({ scheme: ['http', 'https'] }),
  username: schema.string(),
  password: schema.string(),
});

export const IdSchema = schema.object({
  id: schema.string(),
});
