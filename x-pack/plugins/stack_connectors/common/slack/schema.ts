/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';

export const SlackConfigSchema = schema.object({
  type: schema.oneOf([schema.literal('webhook'), schema.literal('web_api')], {
    defaultValue: 'webhook',
  }),
});

export const SlackWebhookSecretsSchema = schema.object({
  webhookUrl: schema.string({ minLength: 1 }),
});
export const SlackWebApiSecretsSchema = schema.object({
  token: schema.string({ minLength: 1 }),
});

export const SlackSecretsSchema = schema.oneOf([
  SlackWebhookSecretsSchema,
  SlackWebApiSecretsSchema,
]);

export const ExecutorGetChannelsParamsSchema = schema.object({
  subAction: schema.literal('getChannels'),
});

export const PostMessageSubActionParamsSchema = schema.object({
  channels: schema.arrayOf(schema.string()),
  text: schema.string(),
});
export const ExecutorPostMessageParamsSchema = schema.object({
  subAction: schema.literal('postMessage'),
  subActionParams: PostMessageSubActionParamsSchema,
});

export const WebhookParamsSchema = schema.object({
  message: schema.string({ minLength: 1 }),
});
export const WebApiParamsSchema = schema.oneOf([
  ExecutorGetChannelsParamsSchema,
  ExecutorPostMessageParamsSchema,
]);

export const SlackParamsSchema = schema.oneOf([WebhookParamsSchema, WebApiParamsSchema]);
