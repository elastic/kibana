/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ValidatorServices } from '@kbn/actions-plugin/server/types';
import type { ActionTypeExecutorResult as ConnectorTypeExecutorResult } from '@kbn/actions-plugin/server/types';
import type {
  SlackSecrets,
  GetChannelsResponse,
  PostMessageParams,
} from '../../../common/slack/types';

export type SlackExecutorResultData = PostMessageResponseList | GetChannelsResponse;

export interface PostMessageResponse {
  ok: boolean;
  channel?: string;
  error?: string;
  message?: {
    text: string;
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
  }) => Promise<ConnectorTypeExecutorResult<unknown>>;
  postMessage: ({
    externalService,
    params,
  }: {
    externalService: SlackService;
    params: PostMessageParams;
  }) => Promise<ConnectorTypeExecutorResult<unknown>>;
}

export interface SlackService {
  getChannels: () => Promise<ConnectorTypeExecutorResult<unknown>>;
  postMessage: ({
    channels,
    text,
  }: PostMessageParams) => Promise<ConnectorTypeExecutorResult<unknown>>;
}

export interface SlackServiceValidation {
  secrets: (secrets: SlackSecrets, validatorServices: ValidatorServices) => void;
}
