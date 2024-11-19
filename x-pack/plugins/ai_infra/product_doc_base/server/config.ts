/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema, type TypeOf } from '@kbn/config-schema';
import type { PluginConfigDescriptor } from '@kbn/core/server';

const configSchema = schema.object({
  artifactRepositoryUrl: schema.string({
    defaultValue: 'https://kibana-knowledge-base-artifacts.elastic.co',
  }),
});

export const config: PluginConfigDescriptor<ProductDocBaseConfig> = {
  schema: configSchema,
  exposeToBrowser: {},
};

export type ProductDocBaseConfig = TypeOf<typeof configSchema>;
