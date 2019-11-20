/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { schema } from '@kbn/config-schema';

export const UserSchema = schema.object({
  id: schema.string(),
  name: schema.string(),
});

export const CommentSchema = schema.object({
  comment: schema.string(),
  creation_date: schema.number(),
  last_edit_date: schema.number(),
  user: UserSchema,
});

export const NewCaseSchema = schema.object({
  assignees: schema.arrayOf(UserSchema, { defaultValue: [] }),
  comments: schema.arrayOf(CommentSchema, { defaultValue: [] }),
  description: schema.string(),
  name: schema.string(),
  reporter: UserSchema,
  state: schema.oneOf([schema.literal('open'), schema.literal('closed')], { defaultValue: 'open' }),
  tags: schema.arrayOf(schema.string(), { defaultValue: [] }),
  case_type: schema.string(),
});

export const UpdatedCaseSchema = schema.object({
  assignees: schema.maybe(schema.arrayOf(UserSchema)),
  comments: schema.maybe(schema.arrayOf(CommentSchema)),
  description: schema.maybe(schema.string()),
  name: schema.maybe(schema.string()),
  state: schema.maybe(schema.oneOf([schema.literal('open'), schema.literal('closed')])),
  tags: schema.maybe(schema.arrayOf(schema.string())),
  case_type: schema.maybe(schema.string()),
});
