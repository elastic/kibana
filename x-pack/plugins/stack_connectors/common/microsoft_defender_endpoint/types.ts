/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { TypeOf } from '@kbn/config-schema';

import {
  MicrosoftDefenderEndpointSecretsSchema,
  MicrosoftDefenderEndpointConfigSchema,
  MicrosoftDefenderEndpointActionParamsSchema,
  MicrosoftDefenderEndpointBaseApiResponseSchema,
  IsolateHostParamsSchema,
  ReleaseHostParamsSchema,
  TestConnectorParamsSchema,
  AgentDetailsParamsSchema,
} from './schema';

export type MicrosoftDefenderEndpointConfig = TypeOf<typeof MicrosoftDefenderEndpointConfigSchema>;

export type MicrosoftDefenderEndpointSecrets = TypeOf<
  typeof MicrosoftDefenderEndpointSecretsSchema
>;

export type MicrosoftDefenderEndpointBaseApiResponse = TypeOf<
  typeof MicrosoftDefenderEndpointBaseApiResponseSchema
>;

export type MicrosoftDefenderEndpointAgentDetailsParams = TypeOf<typeof AgentDetailsParamsSchema>;

export interface MicrosoftDefenderEndpointAgentDetails {
  foo: string; // TODO:PT define
}

export type MicrosoftDefenderEndpointTestConnectorParams = TypeOf<typeof TestConnectorParamsSchema>;

export type MicrosoftDefenderEndpointIsolateHostParams = TypeOf<typeof IsolateHostParamsSchema>;

export type MicrosoftDefenderEndpointReleaseHostParams = TypeOf<typeof ReleaseHostParamsSchema>;

export type MicrosoftDefenderEndpointActionParams = TypeOf<
  typeof MicrosoftDefenderEndpointActionParamsSchema
>;

export interface MicrosoftDefenderEndpointApiTokenResponse {
  token_type: 'bearer';
  /** 	The amount of time that an access token is valid (in seconds NOT milliseconds). */
  expires_in: number;
  access_token: string;
}
