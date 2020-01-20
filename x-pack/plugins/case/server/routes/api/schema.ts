/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { schema } from '@kbn/config-schema';

export const UserSchema = schema.object({
  username: schema.string(),
  full_name: schema.maybe(schema.string()),
});

export const NewCommentSchema = schema.object({
  comment: schema.string(),
});

export const CommentSchema = schema.object({
  comment: schema.string(),
  created_at: schema.number(),
  created_by: UserSchema,
});

export const UpdatedCommentSchema = schema.object({
  comment: schema.string(),
});

export const NewCaseSchema = schema.object({
  assignees: schema.arrayOf(UserSchema, { defaultValue: [] }),
  description: schema.string(),
  title: schema.string(),
  state: schema.oneOf([schema.literal('open'), schema.literal('closed')], { defaultValue: 'open' }),
  tags: schema.arrayOf(schema.string(), { defaultValue: [] }),
  case_type: schema.string(),
});

export const UpdatedCaseSchema = schema.object({
  assignees: schema.maybe(schema.arrayOf(UserSchema)),
  description: schema.maybe(schema.string()),
  title: schema.maybe(schema.string()),
  state: schema.maybe(schema.oneOf([schema.literal('open'), schema.literal('closed')])),
  tags: schema.maybe(schema.arrayOf(schema.string())),
  case_type: schema.maybe(schema.string()),
});
