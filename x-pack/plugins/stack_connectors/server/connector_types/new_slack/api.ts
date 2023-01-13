/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ExternalServiceApi, ExternalService, PostMessageParams } from './types';

const getChannelsHandler = async ({ externalService }: { externalService: ExternalService }) => {
  const res = await externalService.getChannels({});
  return res;
};

const postMessageHandler = async ({
  externalService,
  params: { channel, text },
}: {
  externalService: ExternalService;
  params: PostMessageParams;
}) => {
  const res = await externalService.postMessage({ channel, text });
  return res;
};

export const api: ExternalServiceApi = {
  getChannels: getChannelsHandler,
  postMessage: postMessageHandler,
};
