/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import { D3SecuritySeverity } from './constants';

// Connector schema
export const D3SecurityConfigSchema = schema.object({
  url: schema.string(),
});

export const D3SecuritySecretsSchema = schema.object({ token: schema.string() });

// Run action schema
export const D3SecurityRunActionParamsSchema = schema.object({
  body: schema.maybe(schema.string()),
  severity: schema.maybe(schema.string({ defaultValue: D3SecuritySeverity.EMPTY })),
  eventType: schema.maybe(schema.string({ defaultValue: '' })),
});

export const D3SecurityRunActionResponseSchema = schema.object(
  {
    refid: schema.string(),
  },
  { unknowns: 'ignore' }
);
