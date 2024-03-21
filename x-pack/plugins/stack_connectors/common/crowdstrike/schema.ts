/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import { SUB_ACTION } from './constants';

// Connector schema
export const CrowdstrikeConfigSchema = schema.any();
export const CrowdstrikeSecretsSchema = schema.object({
  clientId: schema.string(),
  clientSecret: schema.string(),
});

export const CrowdstrikeBaseApiResponseSchema = schema.object({}, { unknowns: 'allow' });

export const CrowdstrikeGetAgentsResponseSchema = schema.any();
export const CrowdstrikeIsolateHostResponseSchema = schema.any();

export const CrowdstrikeIsolateHostParamsSchema = schema.any();

export const CrowdstrikeGetAgentsParamsSchema = schema.any();

export const CrowdstrikeGetTokenResponseSchema = schema.object({
  data: schema.object({
    access_token: schema.string(),
    expires_in: schema.number(),
    token_type: schema.string(),
    // fields also existing according to the docs
    // id_token: schema.string(),
    // issued_token_type: schema.string(),
    // refresh_token: schema.string(),
    // scope: schema.string(),
  }),
});

export const CrowdstrikeIsolateHostSchema = schema.object({
  subAction: schema.literal(SUB_ACTION.HOST_ACTIONS),
  subActionParams: CrowdstrikeIsolateHostParamsSchema,
});

export const CrowdstrikeActionParamsSchema = schema.oneOf([CrowdstrikeIsolateHostSchema]);
