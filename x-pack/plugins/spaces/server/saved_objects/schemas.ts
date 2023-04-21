/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { schema } from '@kbn/config-schema';

export const SpacesSavedObjectSchemas = {
  '8.7.0': schema.object({
    description: schema.maybe(schema.string()),
    initials: schema.string(),
    color: schema.string(),
    disabledFeatures: schema.string(),
  }),
};
