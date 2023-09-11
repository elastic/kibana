/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PluginConfigDescriptor } from '@kbn/core/server';
import { schema, TypeOf } from '@kbn/config-schema';

const uptimeConfig = schema.object({
  index: schema.maybe(schema.string()),
  enabled: schema.boolean({ defaultValue: true }),
});

export const config: PluginConfigDescriptor = {
  schema: uptimeConfig,
};

export type UptimeConfig = TypeOf<typeof uptimeConfig>;
