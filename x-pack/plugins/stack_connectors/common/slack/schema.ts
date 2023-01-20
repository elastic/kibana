/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';

export const SlackConfigSchema = schema.object({
  type: schema.oneOf([schema.literal('webhook'), schema.literal('web_api')]),
});

export const SlackWebhookSecretsSchema = schema.object({
  webhookUrl: schema.string(),
});
export const SlackWebApiSecretsSchema = schema.object({
  token: schema.string(),
});

export const SlackSecretsSchema = schema.oneOf([
  SlackWebhookSecretsSchema,
  SlackWebApiSecretsSchema,
]);

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

export const WebhookParamsSchema = schema.object({
  message: schema.string({ minLength: 1 }),
});
export const WebApiParamsSchema = schema.oneOf([
  ExecutorGetChannelsParamsSchema,
  ExecutorPostMessageParamsSchema,
]);

export const ParamsSchema = schema.oneOf([WebApiParamsSchema, WebhookParamsSchema]);
