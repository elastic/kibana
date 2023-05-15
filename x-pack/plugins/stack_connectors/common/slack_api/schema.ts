/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';

export const SlackApiSecretsSchema = schema.object({
  token: schema.string({ minLength: 1 }),
});

export const GetChannelsParamsSchema = schema.object({
  subAction: schema.literal('getChannels'),
});

export const PostMessageSubActionParamsSchema = schema.object({
  channels: schema.arrayOf(schema.string()),
  text: schema.string(),
});
export const PostMessageParamsSchema = schema.object({
  subAction: schema.literal('postMessage'),
  subActionParams: PostMessageSubActionParamsSchema,
});

export const SlackApiParamsSchema = schema.oneOf([
  GetChannelsParamsSchema,
  PostMessageParamsSchema,
]);
