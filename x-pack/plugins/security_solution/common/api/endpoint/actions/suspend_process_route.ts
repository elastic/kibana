/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import { BaseActionRequestSchema } from './common/base';

export const SuspendProcessRouteRequestSchema = {
  body: schema.object({
    ...BaseActionRequestSchema,
    parameters: schema.oneOf([
      schema.object({ pid: schema.number({ min: 1 }) }),
      schema.object({ entity_id: schema.string({ minLength: 1 }) }),
    ]),
  }),
};
