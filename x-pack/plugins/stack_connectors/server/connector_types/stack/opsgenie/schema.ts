/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';

export const ConfigSchema = schema.object({
  apiUrl: schema.string(),
});

export const SecretsSchema = schema.object({
  apiKey: schema.string(),
});

const SuccessfulResponse = schema.object(
  {
    took: schema.number(),
    requestId: schema.string(),
    result: schema.string(),
  },
  { unknowns: 'allow' }
);

const FailureResponse = schema.object(
  {
    took: schema.number(),
    requestId: schema.string(),
    message: schema.maybe(schema.string()),
    result: schema.maybe(schema.string()),
    errors: schema.maybe(schema.object({ message: schema.string() })),
  },
  { unknowns: 'allow' }
);

export const Response = schema.oneOf([SuccessfulResponse, FailureResponse]);

export const CloseAlertParamsSchema = schema.object({
  alias: schema.string(),
  user: schema.maybe(schema.string({ maxLength: 100 })),
  source: schema.maybe(schema.string({ maxLength: 100 })),
  note: schema.maybe(schema.string({ maxLength: 25000 })),
});
