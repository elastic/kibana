/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema, TypeOf } from '@kbn/config-schema';
import {
  config as ElasticsearchBaseConfig,
  ElasticsearchConfig,
} from '../../../../src/core/server/';

const elasticsearchConfigSchema = ElasticsearchBaseConfig.elasticsearch.schema;
export const monitoringElasticsearchConfigSchema = elasticsearchConfigSchema;

export const configSchema = schema.object({
  enabled: schema.boolean({ defaultValue: true }),
  elasticsearch: monitoringElasticsearchConfigSchema,
});

export type MonitoringCollectionConfig = ReturnType<typeof createConfig>;
export function createConfig(config: TypeOf<typeof configSchema>) {
  return {
    ...config,
    elasticsearch: new ElasticsearchConfig(config.elasticsearch),
  };
}
export type MonitoringCollectionConfigSchema = TypeOf<typeof configSchema>;
