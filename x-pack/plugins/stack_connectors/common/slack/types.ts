/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { TypeOf } from '@kbn/config-schema';
import type { ActionTypeExecutorOptions as ConnectorTypeExecutorOptions } from '@kbn/actions-plugin/server/types';
import type { ActionType as ConnectorType } from '@kbn/actions-plugin/server/types';
import {
  ExecutorPostMessageParamsSchema,
  PostMessageSubActionParamsSchema,
  SlackConfigSchema,
  SlackSecretsSchema,
  SlackWebhookSecretsSchema,
  SlackWebApiSecretsSchema,
  WebhookParamsSchema,
  WebApiParamsSchema,
} from './schema';

export type SlackConfig = TypeOf<typeof SlackConfigSchema>;
export type SlackSecrets = TypeOf<typeof SlackSecretsSchema>;

export type PostMessageParams = TypeOf<typeof ExecutorPostMessageParamsSchema>;
export type PostMessageSubActionParams = TypeOf<typeof PostMessageSubActionParamsSchema>;

export type SlackWebhookSecrets = TypeOf<typeof SlackWebhookSecretsSchema>;
export type SlackWebApiSecrets = TypeOf<typeof SlackWebApiSecretsSchema>;

export type SlackWebhookExecutorOptions = ConnectorTypeExecutorOptions<
  SlackConfig,
  SlackWebhookSecrets,
  WebhookParams
>;
export type SlackWebApiExecutorOptions = ConnectorTypeExecutorOptions<
  SlackConfig,
  SlackWebApiSecrets,
  WebApiParams
>;

export type SlackExecutorOptions = ConnectorTypeExecutorOptions<
  SlackConfig,
  SlackSecrets,
  WebhookParams | WebApiParams
>;

export type SlackConnectorType = ConnectorType<
  SlackConfig,
  SlackSecrets,
  WebhookParams | WebApiParams,
  unknown
>;

export type WebhookParams = TypeOf<typeof WebhookParamsSchema>;
export type WebApiParams = TypeOf<typeof WebApiParamsSchema>;
export type SlackActionParams = WebhookParams | WebApiParams;
