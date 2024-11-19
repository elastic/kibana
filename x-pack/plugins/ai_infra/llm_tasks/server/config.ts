/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema, type TypeOf } from '@kbn/config-schema';
import type { PluginConfigDescriptor } from '@kbn/core/server';

const configSchema = schema.object({});

export const config: PluginConfigDescriptor<LlmTasksConfig> = {
  schema: configSchema,
  exposeToBrowser: {},
};

export type LlmTasksConfig = TypeOf<typeof configSchema>;
