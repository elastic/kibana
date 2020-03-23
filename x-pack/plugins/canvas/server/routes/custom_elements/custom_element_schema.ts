/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { schema } from '@kbn/config-schema';

export const CustomElementSchema = schema.object({
  '@created': schema.maybe(schema.string()),
  '@timestamp': schema.maybe(schema.string()),
  content: schema.string(),
  displayName: schema.string(),
  help: schema.maybe(schema.string()),
  id: schema.string(),
  image: schema.maybe(schema.string()),
  name: schema.string(),
  tags: schema.maybe(schema.arrayOf(schema.string())),
});

export const CustomElementUpdateSchema = schema.object({
  displayName: schema.string(),
  help: schema.maybe(schema.string()),
  image: schema.maybe(schema.string()),
  name: schema.string(),
});
