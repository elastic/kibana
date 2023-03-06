/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ActionTypeExecutorResult as ConnectorTypeExecutorResult } from '@kbn/actions-plugin/server/types';
import type { PostMessageSubActionParams } from '../../../common/slack/types';

export interface PostMessageResponse {
  ok: boolean;
  channel?: string;
  error?: string;
  message?: {
    text: string;
  };
}

export interface SlackService {
  getChannels: () => Promise<ConnectorTypeExecutorResult<unknown>>;
  postMessage: ({
    channels,
    text,
  }: PostMessageSubActionParams) => Promise<ConnectorTypeExecutorResult<unknown>>;
}
