/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import { MICROSOFT_DEFENDER_ENDPOINT_SUB_ACTION } from './constants';

// ----------------------------------
// Connector setup schemas
// ----------------------------------
export const MicrosoftDefenderEndpointConfigSchema = schema.object({ url: schema.string() });
export const MicrosoftDefenderEndpointSecretsSchema = schema.object({
  token: schema.string(),
});

// ----------------------------------
// Connector Methods
// ----------------------------------
export const MicrosoftDefenderEndpointBaseApiResponseSchema = schema.maybe(
  schema.object({}, { unknowns: 'allow' })
);

export const IsolateHostParamsSchema = schema.object({
  // FIXME:PT define params once we know them
});

export const ReleaseHostParamsSchema = schema.object({
  // FIXME:PT define params once we know them
});

// ----------------------------------
// Connector Sub-Actions
// ----------------------------------
const IsolateHostSchema = schema.object({
  subAction: schema.literal(MICROSOFT_DEFENDER_ENDPOINT_SUB_ACTION.ISOLATE_HOST),
  subActionParams: IsolateHostParamsSchema,
});

const ReleaseHostSchema = schema.object({
  subAction: schema.literal(MICROSOFT_DEFENDER_ENDPOINT_SUB_ACTION.RELEASE_HOST),
  subActionParams: ReleaseHostParamsSchema,
});

export const MicrosoftDefenderEndpointActionParamsSchema = schema.oneOf([
  IsolateHostSchema,
  ReleaseHostSchema,
]);
