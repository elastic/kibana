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
  SlackConfigSchema,
  SlackSecretsSchema,
  ExecutorGetChannelsParamsSchema,
  ExecutorPostMessageParamsSchema,
  SlackWebhookSecretsSchema,
  SlackWebApiSecretsSchema,
  WebhookParamsSchema,
  WebApiParamsSchema,
} from './schema';

export type SlackConfig = TypeOf<typeof SlackConfigSchema>;
export type SlackSecrets = TypeOf<typeof SlackSecretsSchema>;

export type SubAction = 'postMessage' | 'getChannels';

export type ExecutorGetChannelsParams = TypeOf<typeof ExecutorGetChannelsParamsSchema>;
export type ExecutorPostMessageParams = TypeOf<typeof ExecutorPostMessageParamsSchema>;

export type SlackExecuteActionParams = ExecutorGetChannelsParams | ExecutorPostMessageParams;

export interface PostMessageParams {
  channels: string[];
  text: string;
}

export type SlackWebhookSecrets = TypeOf<typeof SlackWebhookSecretsSchema>;
export type SlackWebApiSecrets = TypeOf<typeof SlackWebApiSecretsSchema>;

export type SlackWebhookExecutorOptions = ConnectorTypeExecutorOptions<
  {},
  SlackWebhookSecrets,
  WebhookParams
>;
export type SlackWebApiExecutorOptions = ConnectorTypeExecutorOptions<
  {},
  SlackWebApiSecrets,
  WebApiParams
>;

export type SlackExecutorOptions = ConnectorTypeExecutorOptions<
  {},
  SlackSecrets,
  WebhookParams | WebApiParams
>;

export type SlackConnectorType = ConnectorType<
  {},
  SlackSecrets,
  WebhookParams | WebApiParams,
  unknown
>;

export type WebhookParams = TypeOf<typeof WebhookParamsSchema>;
export type WebApiParams = TypeOf<typeof WebApiParamsSchema>;
export type ActionParams = WebhookParams | WebApiParams;

export interface GetChannelsResponse {
  ok: true;
  channels: Array<{
    id: string;
    name: string;
    is_channel: boolean;
    is_archived: boolean;
    is_private: boolean;
  }>;
}
