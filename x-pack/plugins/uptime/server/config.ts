/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { PluginConfigDescriptor } from 'kibana/server';
import { schema, TypeOf } from '@kbn/config-schema';

export const config: PluginConfigDescriptor = {
  schema: schema.maybe(
    schema.object({
      index: schema.string(),
    })
  ),
};

export type UptimeConfig = TypeOf<typeof config.schema>;
