/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { schema } from '@kbn/config-schema';

export const setupModuleBodySchema = schema.object({
  prefix: schema.maybe(schema.string()),
  groups: schema.maybe(schema.arrayOf(schema.string())),
  indexPatternName: schema.maybe(schema.string()),
  query: schema.maybe(schema.any()),
  useDedicatedIndex: schema.maybe(schema.boolean()),
  startDatafeed: schema.maybe(schema.boolean()),
  start: schema.maybe(schema.number()),
  end: schema.maybe(schema.number()),
  jobOverrides: schema.maybe(schema.any()),
  datafeedOverrides: schema.maybe(schema.any()),
});

export const getModuleIdParamSchema = (optional = false) => {
  const stringType = schema.string();
  return { moduleId: optional ? schema.maybe(stringType) : stringType };
};
