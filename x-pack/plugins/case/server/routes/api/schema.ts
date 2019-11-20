/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { schema } from '@kbn/config-schema';

export const User = schema.object({
  id: schema.string(),
  name: schema.string(),
});

export const Comment = schema.object({
  id: schema.string(),
  comment: schema.number(),
  creation_date: schema.number(),
  last_edit_date: schema.string(),
  user: User,
});

export const NewCaseSchema = schema.object({
  assignees: schema.arrayOf(User, { defaultValue: [] }),
  comments: schema.arrayOf(Comment, { defaultValue: [] }),
  description: schema.string(),
  name: schema.string(),
  // reporter: User,
  state: schema.oneOf([schema.literal('open'), schema.literal('closed')], { defaultValue: 'open' }),
  tags: schema.arrayOf(schema.string(), { defaultValue: [] }),
  type: schema.string(),
});

export const UpdatedCaseSchema = schema.object({
  assignees: schema.maybe(schema.arrayOf(User)),
  comments: schema.nullable(schema.arrayOf(Comment)),
  description: schema.nullable(schema.string()),
  name: schema.nullable(schema.string()),
  state: schema.nullable(schema.oneOf([schema.literal('open'), schema.literal('closed')])),
  tags: schema.nullable(schema.arrayOf(schema.string())),
  type: schema.nullable(schema.string()),
});

// export const CaseSchema = schema.object({
//   assignees: schema.arrayOf(User),
//   comments: schema.arrayOf(Comment),
//   creation_date: schema.string(),
//   description: schema.string(),
//   id: schema.string(),
//   last_edit_date: schema.string(),
//   name: schema.string(),
//   reporter: User,
//   state: schema.oneOf([schema.literal('open'), schema.literal('closed')], { defaultValue: 'open' }),
//   tags: schema.arrayOf(schema.string()),
//   type: schema.string(),
// });
