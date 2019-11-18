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
  comment: schema.string(),
  creation_date: schema.string(),
  last_edit_date: schema.string(),
  user: User,
});

export const NewCaseSchema = schema.object({
  assignees: schema.maybe(schema.arrayOf(User)),
  // comments: schema.arrayOf(Comment),
  // creation_date: schema.string(),
  description: schema.string(),
  id: schema.string(),
  // last_edit_date: schema.string(),
  name: schema.string(),
  // reporter: User,
  state: schema.oneOf([schema.literal('open'), schema.literal('closed')], { defaultValue: 'open' }),
  tags: schema.maybe(schema.arrayOf(schema.string())),
  type: schema.string(),
});
