/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';

// Do not need url. But keep it for investigation
// const ExternalSlackServiceConfiguration = {
//   url: schema.maybe(schema.string()),
// };

// export const ExternalSlackServiceConfigurationSchema = schema.object(
//   ExternalSlackServiceConfiguration
// );

export const ExternalSlackServiceSecretConfigurationSchema = schema.object({
  token: schema.string(),
});

export const ExecutorSubActionGetChannelsParamsSchema = schema.object({});
export const ExecutorSubActionPostMessageParamsSchema = schema.object({
  channel: schema.string(),
  text: schema.string(),
});

export const ExecutorParamsSchema = schema.oneOf([
  schema.object({
    subAction: schema.literal('getChannels'),
    subActionParams: ExecutorSubActionGetChannelsParamsSchema,
  }),
  schema.object({
    subAction: schema.literal('postMessage'),
    subActionParams: ExecutorSubActionPostMessageParamsSchema,
  }),
]);
