/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';

export const SlackConfigSchema = schema.object({});
export const SlackSecretsSchema = schema.object({
  token: schema.string(),
});

export const GetChannelsParamsSchema = schema.object({});
export const PostMessageParamsSchema = schema.object({
  channels: schema.arrayOf(schema.string()),
  text: schema.string(),
});

export const ExecutorGetChannelsParamsSchema = schema.object({
  subAction: schema.literal('getChannels'),
  subActionParams: GetChannelsParamsSchema,
});

export const ExecutorPostMessageParamsSchema = schema.object({
  subAction: schema.literal('postMessage'),
  subActionParams: PostMessageParamsSchema,
});

export const ExecutorParamsSchema = schema.oneOf([
  ExecutorGetChannelsParamsSchema,
  schema.object({
    subAction: schema.literal('postMessage'),
    subActionParams: PostMessageParamsSchema,
  }),
]);
