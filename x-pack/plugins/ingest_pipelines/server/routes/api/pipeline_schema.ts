/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { schema } from '@kbn/config-schema';

export const pipelineSchema = {
  description: schema.maybe(schema.string()),
  processors: schema.arrayOf(schema.recordOf(schema.string(), schema.any())),
  version: schema.maybe(schema.number()),
  on_failure: schema.maybe(schema.arrayOf(schema.recordOf(schema.string(), schema.any()))),
};
