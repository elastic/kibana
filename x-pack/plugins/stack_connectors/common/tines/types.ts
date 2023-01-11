/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { TypeOf } from '@kbn/config-schema';
import {
  TinesConfigSchema,
  TinesSecretsSchema,
  TinesRunActionParamsSchema,
  TinesRunActionResponseSchema,
  TinesStoriesActionResponseSchema,
  TinesWebhooksActionResponseSchema,
  TinesWebhooksActionParamsSchema,
  TinesWebhookObjectSchema,
  TinesStoryObjectSchema,
} from './schema';

export type TinesConfig = TypeOf<typeof TinesConfigSchema>;
export type TinesSecrets = TypeOf<typeof TinesSecretsSchema>;
export type TinesRunActionParams = TypeOf<typeof TinesRunActionParamsSchema>;
export type TinesRunActionResponse = TypeOf<typeof TinesRunActionResponseSchema>;
export type TinesStoriesActionParams = void;
export type TinesStoryObject = TypeOf<typeof TinesStoryObjectSchema>;
export type TinesStoriesActionResponse = TypeOf<typeof TinesStoriesActionResponseSchema>;
export type TinesWebhooksActionParams = TypeOf<typeof TinesWebhooksActionParamsSchema>;
export type TinesWebhooksActionResponse = TypeOf<typeof TinesWebhooksActionResponseSchema>;
export type TinesWebhookObject = TypeOf<typeof TinesWebhookObjectSchema>;
