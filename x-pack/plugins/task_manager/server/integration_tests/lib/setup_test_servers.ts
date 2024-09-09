/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import deepmerge from 'deepmerge';
import { createTestServers, createRootWithCorePlugins } from '@kbn/core-test-helpers-kbn-server';

function createRoot(settings = {}) {
  return createRootWithCorePlugins(
    deepmerge(
      {
        logging: {
          root: {
            level: 'warn',
          },
          loggers: [
            {
              name: 'plugins.taskManager',
              level: 'all',
            },
            {
              name: 'plugins.taskManager.metrics-debugger',
              level: 'warn',
            },
            {
              name: 'plugins.taskManager.metrics-subscribe-debugger',
              level: 'warn',
            },
          ],
        },
      },
      settings
    ),
    { oss: false }
  );
}
export async function setupTestServers(settings = {}) {
  const { startES } = createTestServers({
    adjustTimeout: (t) => jest.setTimeout(t),
    settings: {
      es: {
        license: 'trial',
      },
    },
  });

  const esServer = await startES();

  const root = createRoot(settings);

  await root.preboot();
  const coreSetup = await root.setup();
  const coreStart = await root.start();

  return {
    esServer,
    kibanaServer: {
      root,
      coreSetup,
      coreStart,
      stop: async () => await root.shutdown(),
    },
  };
}

export async function setupKibanaServer(settings = {}) {
  const root = createRoot(settings);

  await root.preboot();
  const coreSetup = await root.setup();
  const coreStart = await root.start();

  return {
    kibanaServer: {
      root,
      coreSetup,
      coreStart,
      stop: async () => await root.shutdown(),
    },
  };
}
