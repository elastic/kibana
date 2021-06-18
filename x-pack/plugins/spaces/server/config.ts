/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Observable } from 'rxjs';

import type { TypeOf } from '@kbn/config-schema';
import { schema } from '@kbn/config-schema';
import type {
  ConfigDeprecation,
  ConfigDeprecationProvider,
  PluginInitializerContext,
} from 'src/core/server';

export const ConfigSchema = schema.object({
  enabled: schema.boolean({ defaultValue: true }),
  maxSpaces: schema.number({ defaultValue: 1000 }),
});

export function createConfig$(context: PluginInitializerContext) {
  return context.config.create<TypeOf<typeof ConfigSchema>>();
}

const disabledDeprecation: ConfigDeprecation = (config, fromPath, addDeprecation) => {
  if (config.xpack?.spaces?.enabled === false) {
    addDeprecation({
      message: `Disabling the Spaces plugin (xpack.spaces.enabled) will not be supported in the next major version (8.0)`,
      correctiveActions: {
        manualSteps: [`Remove "xpack.spaces.enabled: false" from your Kibana configuration`],
      },
    });
  }
};

export const spacesConfigDeprecationProvider: ConfigDeprecationProvider = () => {
  return [disabledDeprecation];
};

export type ConfigType = ReturnType<typeof createConfig$> extends Observable<infer P>
  ? P
  : ReturnType<typeof createConfig$>;
