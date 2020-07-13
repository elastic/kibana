/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { schema } from '@kbn/config-schema';

export const schemaTransformId = {
  params: schema.object({
    transformId: schema.string(),
  }),
};

export interface SchemaTransformId {
  transformId: string;
}

export const deleteTransformSchema = schema.object({
  /**
   * Delete Transform & Destination Index
   */
  transformsInfo: schema.arrayOf(
    schema.object({
      id: schema.string(),
      state: schema.maybe(schema.string()),
    })
  ),
  deleteDestIndex: schema.maybe(schema.boolean()),
  deleteDestIndexPattern: schema.maybe(schema.boolean()),
  forceDelete: schema.maybe(schema.boolean()),
});
