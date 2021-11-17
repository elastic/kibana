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
      index: schema.maybe(schema.string()),
      unsafe: schema.maybe(
        schema.object({
          service: schema.maybe(
            schema.object({
              username: schema.maybe(schema.string()),
              password: schema.maybe(schema.string()),
              url: schema.maybe(schema.string()),
              hosts: schema.arrayOf(schema.string()),
            })
          ),
        })
      ),
    })
  ),
};

export type UptimeConfig = TypeOf<typeof config.schema>;
