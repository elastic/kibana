/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema, TypeOf } from '@kbn/config-schema';
import type {
  PluginInitializerContext,
  ConfigDeprecationProvider,
  ConfigDeprecation,
} from 'src/core/server';
import { Observable } from 'rxjs';

export const ConfigSchema = schema.object({
  enabled: schema.boolean({ defaultValue: true }),
  maxSpaces: schema.number({ defaultValue: 1000 }),
});

export function createConfig$(context: PluginInitializerContext) {
  return context.config.create<TypeOf<typeof ConfigSchema>>();
}

const disabledDeprecation: ConfigDeprecation = (config, fromPath, log) => {
  if (config.xpack?.spaces?.enabled === false) {
    log(
      `Disabling the spaces plugin (xpack.spaces.enabled) will not be supported in the next major version (8.0)`
    );
  }
  return config;
};

export const spacesConfigDeprecationProvider: ConfigDeprecationProvider = () => {
  return [disabledDeprecation];
};

export type ConfigType = ReturnType<typeof createConfig$> extends Observable<infer P>
  ? P
  : ReturnType<typeof createConfig$>;
