/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

export function createConditionalPlugin(
  config: any,
  configPrefix: string,
  plugins: any,
  pluginId: string
) {
  return new Proxy(
    {},
    {
      get(obj, prop) {
        if (prop === 'isEnabled') {
          return config.get(`${configPrefix}.enabled`);
        }

        if (!plugins[pluginId]) {
          throw new Error(`Plugin accessed before it's available`);
        }

        return plugins[pluginId][prop];
      },
    }
  );
}
