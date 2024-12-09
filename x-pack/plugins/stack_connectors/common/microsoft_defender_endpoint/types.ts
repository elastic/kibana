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
} from './schema';

export type MicrosoftDefenderEndpointConfig = TypeOf<typeof MicrosoftDefenderEndpointConfigSchema>;

export type MicrosoftDefenderEndpointSecrets = TypeOf<
  typeof MicrosoftDefenderEndpointSecretsSchema
>;

export type MicrosoftDefenderEndpointBaseApiResponse = TypeOf<
  typeof MicrosoftDefenderEndpointBaseApiResponseSchema
>;

export type TestConnectorParams = TypeOf<typeof TestConnectorParamsSchema>;

export type IsolateHostParams = TypeOf<typeof IsolateHostParamsSchema>;

export type ReleaseHostParams = TypeOf<typeof ReleaseHostParamsSchema>;

export type MicrosoftDefenderEndpointActionParams = TypeOf<
  typeof MicrosoftDefenderEndpointActionParamsSchema
>;
