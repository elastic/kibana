/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { schema, TypeOf } from '@kbn/config-schema';
import { PluginConfigDescriptor, config as coreConfig } from '../../../../src/core/server';

const configSchema = schema.object({
  enabled: schema.boolean({ defaultValue: false }),
  appender: schema.maybe(coreConfig.logging.appenders),
  logger: schema.object({
    enabled: schema.boolean({ defaultValue: false }),
  }),
});

export type AuditTrailConfigType = TypeOf<typeof configSchema>;

export const config: PluginConfigDescriptor<AuditTrailConfigType> = {
  schema: configSchema,
};
