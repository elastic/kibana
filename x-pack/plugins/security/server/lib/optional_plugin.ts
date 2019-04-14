/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

interface Config {
  get(key: string): any;
}

interface Plugins {
  [key: string]: any;
}

interface IsEnabled {
  isEnabled: boolean;
}

export type OptionalPlugin<T> = IsEnabled & T;

export function createOptionalPlugin<T>(
  config: Config,
  configPrefix: string,
  plugins: Plugins,
  pluginId: string
): OptionalPlugin<T> {
  return new Proxy(
    {},
    {
      get(obj, prop) {
        const isEnabled = config.get(`${configPrefix}.enabled`);
        if (prop === 'isEnabled') {
          return isEnabled;
        }

        if (!plugins[pluginId] && isEnabled) {
          throw new Error(`Plugin accessed before it's available`);
        }

        if (!plugins[pluginId] && !isEnabled) {
          throw new Error(`Plugin isn't enabled, check isEnabled before using`);
        }

        return plugins[pluginId][prop];
      },
    }
  ) as OptionalPlugin<T>;
}
