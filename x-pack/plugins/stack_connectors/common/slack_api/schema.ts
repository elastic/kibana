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

export const SlackApiConfigSchema = schema.object({
  allowedChannels: schema.maybe(
    schema.arrayOf(
      schema.object({
        id: schema.string({ minLength: 1 }),
        name: schema.string({ minLength: 1 }),
      }),
      { maxSize: 25 }
    )
  ),
});

export const ValidChannelIdSubActionParamsSchema = schema.object({
  channelId: schema.maybe(schema.string()),
});

export const ValidChannelIdParamsSchema = schema.object({
  subAction: schema.literal('validChannelId'),
  subActionParams: ValidChannelIdSubActionParamsSchema,
});

export const PostMessageSubActionParamsSchema = schema.object({
  channels: schema.maybe(schema.arrayOf(schema.string(), { maxSize: 1 })),
  channelIds: schema.maybe(schema.arrayOf(schema.string(), { maxSize: 1 })),
  text: schema.string({ minLength: 1 }),
});

export function validateBlockkit(text: string) {
  try {
    const parsedText = JSON.parse(text);

    if (!Object.hasOwn(parsedText, 'blocks')) {
      return 'block kit body must contain field "blocks"';
    }
  } catch (err) {
    return `block kit body is not valid JSON - ${err.message}`;
  }
}

export const PostBlockkitSubActionParamsSchema = schema.object({
  channels: schema.maybe(schema.arrayOf(schema.string(), { maxSize: 1 })),
  channelIds: schema.maybe(schema.arrayOf(schema.string(), { maxSize: 1 })),
  text: schema.string({ validate: validateBlockkit }),
});

export const PostMessageParamsSchema = schema.object({
  subAction: schema.literal('postMessage'),
  subActionParams: PostMessageSubActionParamsSchema,
});

export const PostBlockkitParamsSchema = schema.object({
  subAction: schema.literal('postBlockkit'),
  subActionParams: PostBlockkitSubActionParamsSchema,
});

export const SlackApiParamsSchema = schema.oneOf([
  ValidChannelIdParamsSchema,
  PostMessageParamsSchema,
  PostBlockkitParamsSchema,
]);
