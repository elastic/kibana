/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema, TypeOf } from '@kbn/config-schema';
import { PluginConfigDescriptor } from '@kbn/core/server';

const configSchema = schema.object({
  enabled: schema.boolean({ defaultValue: false }),
  tracing: schema.object(
    {
      langsmith: schema.maybe(
        schema.object({
          enabled: schema.boolean({ defaultValue: false }),
          apiKey: schema.string(),
          apiUrl: schema.string({ defaultValue: 'https://api.smith.langchain.com' }),
          project: schema.string(),
        })
      ),
    },
    { defaultValue: {} }
  ),
});

export type WorkChatAppConfig = TypeOf<typeof configSchema>;

export type WorkChatTracingConfig = WorkChatAppConfig['tracing'];

export const config: PluginConfigDescriptor<WorkChatAppConfig> = {
  exposeToBrowser: {},
  schema: configSchema,
};
