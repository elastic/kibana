/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Observable } from 'rxjs';

import type { TypeOf } from '@kbn/config-schema';
import { offeringBasedSchema, schema } from '@kbn/config-schema';
import type { PluginInitializerContext } from '@kbn/core/server';

export const ConfigSchema = schema.object({
  enabled: schema.conditional(
    schema.contextRef('dev'),
    true,
    schema.boolean({ defaultValue: true }),
    schema.boolean({
      validate: (rawValue) => {
        if (rawValue === false) {
          return 'Spaces can only be disabled in development mode';
        }
      },
      defaultValue: true,
    })
  ),
  maxSpaces: schema.number({ defaultValue: 1000 }),
  allowFeatureVisibility: offeringBasedSchema({
    serverless: schema.literal(false),
    traditional: schema.boolean({
      validate: (rawValue) => {
        // This setting should not be configurable on-prem to avoid bugs when e.g. existing spaces
        // have feature visibility customized but admins would be unable to change them back if the
        // UI/APIs are disabled.
        if (rawValue === false) {
          return 'Feature visibility can only be disabled on serverless';
        }
      },
      defaultValue: true,
    }),
  }),
});

export function createConfig$(context: PluginInitializerContext) {
  return context.config.create<TypeOf<typeof ConfigSchema>>();
}
export type ConfigType = ReturnType<typeof createConfig$> extends Observable<infer P>
  ? P
  : ReturnType<typeof createConfig$>;
