/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  createRootWithCorePlugins,
  createTestServers,
  request,
} from '@kbn/core/test_helpers/kbn_server';
import pRetry from 'p-retry';
import { fileKindsRegistry } from '../../file_kinds_registry';

export async function setupIntegrationEnvironment() {
  const fileKind: string = 'test-file-kind';
  const testIndex = '.kibana-test-files';
  const testConfig = {
    xpack: {
      reporting: { enabled: false },
    },
  };

  fileKindsRegistry.register({
    id: fileKind,
    blobStoreSettings: {
      esFixedSizeIndex: { index: testIndex },
    },
    http: {
      create: { tags: ['access:myapp'] },
      delete: { tags: ['access:myapp'] },
      update: { tags: ['access:myapp'] },
      download: { tags: ['access:myapp'] },
      getById: { tags: ['access:myapp'] },
      list: { tags: ['access:myapp'] },
    },
  });

  const { startES } = createTestServers({
    adjustTimeout: jest.setTimeout,
    settings: {
      es: {
        license: 'basic',
      },
    },
  });
  const manageES = await startES();
  const root = createRootWithCorePlugins(testConfig, { oss: false });
  const coreStart = await root.start();
  const esClient = coreStart.elasticsearch.client.asInternalUser;
  await root.preboot();
  await root.setup();

  await pRetry(() => request.get(root, '/api/licensing/info').expect(200), { retries: 5 });

  return {
    manageES,
    esClient,
    root,
    coreStart,
    fileKind,
    testIndex,
  };
}
