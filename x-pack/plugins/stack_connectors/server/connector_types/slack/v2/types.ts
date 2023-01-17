/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ValidatorServices } from '@kbn/actions-plugin/server/types';
import type {
  SlackSecrets,
  GetChannelsResponse,
  PostMessageParams,
} from '../../../../common/slack/types';

export type SlackExecutorResultData = PostMessageResponseList | GetChannelsResponse;

export interface PostMessageResponse {
  ok: boolean;
  channel: string;
  ts: string;
  message: {
    text: string;
    username: string;
    bot_id: string;
    type: 'message';
    subtype: string;
    ts: string;
  };
}

export type PostMessageResponseList = PostMessageResponse[];

export interface SlackServiceCredentials {
  secrets: SlackSecrets;
}

export interface SlackServiceApi {
  getChannels: ({
    externalService,
  }: {
    externalService: SlackService;
  }) => Promise<GetChannelsResponse>;
  postMessage: ({
    externalService,
    params,
  }: {
    externalService: SlackService;
    params: PostMessageParams;
  }) => Promise<PostMessageResponseList>;
}

export interface SlackService {
  getChannels: ({}) => Promise<GetChannelsResponse>;
  postMessage: ({ channels, text }: PostMessageParams) => Promise<PostMessageResponseList>;
}

export interface SlackServiceValidation {
  config: (configObject: {}, validatorServices: ValidatorServices) => void;
  secrets: (secrets: { token: string }, validatorServices: ValidatorServices) => void;
}
