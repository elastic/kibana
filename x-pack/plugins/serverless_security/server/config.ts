/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema, TypeOf } from '@kbn/config-schema';
import { PluginConfigDescriptor } from '@kbn/core/server';

export * from './types';

const projectSku = schema.oneOf([
  schema.literal('endpointEssentials'),
  schema.literal('cloudEssentials'),
]);
export type ServerlessSecuritySku = TypeOf<typeof projectSku>;

const projectSkus = schema.arrayOf<ServerlessSecuritySku>(projectSku, {
  defaultValue: ['endpointEssentials'],
});
export type ServerlessSecuritySkus = TypeOf<typeof projectSkus>;

const configSchema = schema.object({
  enabled: schema.boolean({ defaultValue: false }),
  projectSkus,
});
export type ServerlessSecurityConfig = TypeOf<typeof configSchema>;

export const config: PluginConfigDescriptor<ServerlessSecurityConfig> = {
  schema: configSchema,
};
