/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { schema } from '@kbn/config-schema';

export const validateTree = {
  params: schema.object({ id: schema.string() }),
  query: schema.object({
    children: schema.number({ defaultValue: 10, min: 0, max: 100 }),
    generations: schema.number({ defaultValue: 3, min: 0, max: 3 }),
    ancestors: schema.number({ defaultValue: 3, min: 0, max: 5 }),
    events: schema.number({ defaultValue: 100, min: 0, max: 1000 }),
    afterEvent: schema.maybe(schema.string()),
    afterChild: schema.maybe(schema.string()),
    legacyEndpointID: schema.maybe(schema.string()),
  }),
};
