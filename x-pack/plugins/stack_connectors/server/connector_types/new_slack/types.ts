/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { TypeOf } from '@kbn/config-schema';
import { ValidatorServices } from '@kbn/actions-plugin/server/types';
import {
  ExecutorSubActionPostMessageParamsSchema,
  ExecutorSubActionGetChannelsParamsSchema,
} from '../../../common/slack/schema';
import type { SlackConfig, SlackSecrets } from '../../../common/slack/types';

// export type SlackConfig = TypeOf<typeof SlackConfigSchema>;
// export type SlackSecrets = TypeOf<typeof SlackSecretsSchema>;

export type SlackExecutorResultData = PostMessageResponse; // | GetChannelsResponse;

export interface PostMessageResponse {
  ok: boolean;
  channel: string;
  ts: string;
  message: {
    text: string;
    username: string;
    bot_id: string;
    // attachments: [
    //   {
    //     text: string;
    //     id: number;
    //     fallback: string;
    //   }
    // ];
    type: 'message';
    subtype: string; // 'bot_message'?
    ts: string;
  };
}
export interface GetChannelsResponse {
  ok: true;
  channels: [
    {
      id: string;
      name: string;
      is_channel: boolean;
      is_archived: boolean;
      is_private: boolean;
    }
  ];
}

export interface ExternalServiceApi {
  getChannels: ({
    externalService,
  }: {
    externalService: ExternalService;
  }) => Promise<GetChannelsResponse>;
  postMessage: ({
    externalService,
    params,
  }: {
    externalService: ExternalService;
    params: PostMessageParams;
  }) => Promise<PostMessageResponse>;
}

export interface ExternalServiceCredentials {
  config: SlackConfig;
  secrets: SlackSecrets;
}

// export type ExecutorParams = TypeOf<typeof ExecutorParamsSchema>;

export type ExecutorSubActionGetChannelsParams = TypeOf<
  typeof ExecutorSubActionGetChannelsParamsSchema
>;
export type ExecutorSubActionPostMessageParams = TypeOf<
  typeof ExecutorSubActionPostMessageParamsSchema
>;

export interface PostMessageParams {
  channel: string;
  text: string;
}
export interface ExternalService {
  getChannels: ({}) => Promise<GetChannelsResponse>;
  postMessage: ({ channel, text }: PostMessageParams) => Promise<PostMessageResponse>;
}

export interface ExternalServiceValidation {
  config: (configObject: {}, validatorServices: ValidatorServices) => void;
  secrets: (secrets: { token: string }, validatorServices: ValidatorServices) => void;
}
