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

export const ExecutorGetChannelsParamsSchema = schema.object({
  subAction: schema.literal('getChannels'),
  subActionParams: schema.object({}),
});

export const ExecutorPostMessageParamsSchema = schema.object({
  subAction: schema.literal('postMessage'),
  subActionParams: schema.object({
    channels: schema.arrayOf(schema.string()),
    text: schema.string(),
  }),
});

export const ExecutorParamsSchema = schema.oneOf([
  ExecutorGetChannelsParamsSchema,
  ExecutorPostMessageParamsSchema,
]);
