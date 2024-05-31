/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  PostMessageSubActionParams,
  PostBlockkitSubActionParams,
  SlackApiService,
  ValidChannelIdSubActionParams,
} from '../../../common/slack_api/types';

const validChannelIdHandler = async ({
  externalService,
  params: { channelId },
}: {
  externalService: SlackApiService;
  params: ValidChannelIdSubActionParams;
}) => await externalService.validChannelId(channelId ?? '');

const postMessageHandler = async ({
  externalService,
  params: { channelIds, channels, text },
}: {
  externalService: SlackApiService;
  params: PostMessageSubActionParams;
}) => await externalService.postMessage({ channelIds, channels, text });

const postBlockkitHandler = async ({
  externalService,
  params: { channelIds, channels, text },
}: {
  externalService: SlackApiService;
  params: PostBlockkitSubActionParams;
}) => await externalService.postBlockkit({ channelIds, channels, text });

export const api = {
  validChannelId: validChannelIdHandler,
  postMessage: postMessageHandler,
  postBlockkit: postBlockkitHandler,
};
