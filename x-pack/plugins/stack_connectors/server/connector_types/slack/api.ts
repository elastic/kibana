/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SlackServiceApi, SlackService } from './types';
import type { PostMessageParams } from '../../../common/slack/types';

const getChannelsHandler = async ({ externalService }: { externalService: SlackService }) => {
  const res = await externalService.getChannels({});
  return res;
};

const postMessageHandler = async ({
  externalService,
  params: { channels, text },
}: {
  externalService: SlackService;
  params: PostMessageParams;
}) => {
  const res = await externalService.postMessage({ channels, text });
  return res;
};

export const api: SlackServiceApi = {
  getChannels: getChannelsHandler,
  postMessage: postMessageHandler,
};
