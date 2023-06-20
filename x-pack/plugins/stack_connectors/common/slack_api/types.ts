/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ActionType as ConnectorType } from '@kbn/actions-plugin/server/types';
import { TypeOf } from '@kbn/config-schema';
import type { ActionTypeExecutorOptions as ConnectorTypeExecutorOptions } from '@kbn/actions-plugin/server/types';
import type { ActionTypeExecutorResult as ConnectorTypeExecutorResult } from '@kbn/actions-plugin/server/types';
import {
  PostMessageParamsSchema,
  PostMessageSubActionParamsSchema,
  SlackApiSecretsSchema,
  SlackApiParamsSchema,
  SlackApiConfigSchema,
} from './schema';

export type SlackApiSecrets = TypeOf<typeof SlackApiSecretsSchema>;
export type SlackApiConfig = TypeOf<typeof SlackApiConfigSchema>;

export type PostMessageParams = TypeOf<typeof PostMessageParamsSchema>;
export type PostMessageSubActionParams = TypeOf<typeof PostMessageSubActionParamsSchema>;
export type SlackApiParams = TypeOf<typeof SlackApiParamsSchema>;
export type SlackApiConnectorType = ConnectorType<
  SlackApiConfig,
  SlackApiSecrets,
  SlackApiParams,
  unknown
>;

export type SlackApiExecutorOptions = ConnectorTypeExecutorOptions<
  SlackApiConfig,
  SlackApiSecrets,
  SlackApiParams
>;

export type SlackExecutorOptions = ConnectorTypeExecutorOptions<
  SlackApiConfig,
  SlackApiSecrets,
  SlackApiParams
>;

export type SlackApiActionParams = TypeOf<typeof SlackApiParamsSchema>;

export interface SlackAPiResponse {
  ok: boolean;
  error?: string;
  message?: {
    text: string;
  };
  response_metadata?: {
    next_cursor: string;
  };
}

export interface ChannelsResponse {
  id: string;
  name: string;
  is_channel: boolean;
  is_archived: boolean;
  is_private: boolean;
}
export interface GetChannelsResponse extends SlackAPiResponse {
  channels?: ChannelsResponse[];
}

export interface PostMessageResponse extends SlackAPiResponse {
  channel?: string;
}

export interface SlackApiService {
  getChannels: () => Promise<ConnectorTypeExecutorResult<GetChannelsResponse | void>>;
  postMessage: ({
    channels,
    text,
  }: PostMessageSubActionParams) => Promise<ConnectorTypeExecutorResult<unknown>>;
}
