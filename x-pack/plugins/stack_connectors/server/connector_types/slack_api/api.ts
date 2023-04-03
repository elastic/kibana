/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PostMessageSubActionParams, SlackApiService } from '../../../common/slack_api/types';

const getChannelsHandler = async ({ externalService }: { externalService: SlackApiService }) => {
  const res = await externalService.getChannels();
  return res;
};

const postMessageHandler = async ({
  externalService,
  params: { channels, text },
}: {
  externalService: SlackApiService;
  params: PostMessageSubActionParams;
}) => {
  const res = await externalService.postMessage({ channels, text });
  return res;
};

export const api = {
  getChannels: getChannelsHandler,
  postMessage: postMessageHandler,
};
