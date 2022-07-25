/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema, TypeOf } from '@kbn/config-schema';
import { Logger } from '@kbn/core/server';

export type RelatedSavedObjects = TypeOf<typeof RelatedSavedObjectsSchema>;

const RelatedSavedObjectsSchema = schema.arrayOf(
  schema.object({
    namespace: schema.maybe(schema.string({ minLength: 1 })),
    id: schema.string({ minLength: 1 }),
    type: schema.string({ minLength: 1 }),
    // optional; for SO types like action/alert that have type id's
    typeId: schema.maybe(schema.string({ minLength: 1 })),
  }),
  { defaultValue: [] }
);

export function validatedRelatedSavedObjects(logger: Logger, data: unknown): RelatedSavedObjects {
  try {
    return RelatedSavedObjectsSchema.validate(data);
  } catch (err) {
    logger.warn(`ignoring invalid related saved objects: ${err.message}`);
    return [];
  }
}
