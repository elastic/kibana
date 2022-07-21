/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { defaults } from 'lodash';
import {
  createRootWithCorePlugins,
  createTestServers,
  request,
} from '@kbn/core/test_helpers/kbn_server';
import pRetry from 'p-retry';
import { FileJSON } from '../../../common';
import { fileKindsRegistry } from '../../file_kinds_registry';

export type TestEnvironmentUtils = Awaited<ReturnType<typeof setupIntegrationEnvironment>>;

export async function setupIntegrationEnvironment() {
  const fileKind: string = 'test-file-kind';
  const testIndex = '.kibana-test-files';
  const testConfig = {
    xpack: {
      reporting: { enabled: false },
    },
  };

  let disposables: Array<() => Promise<void>> = [];
  const createFile = async (
    fileAttrs: Partial<{
      name: string;
      alt: string;
      meta: Record<string, any>;
      mimeType: string;
    }> = {}
  ): Promise<FileJSON> => {
    const result = await request
      .post(root, `/api/files/files/${fileKind}`)
      .send(
        defaults(fileAttrs, {
          name: 'myFile',
          alt: 'a picture of my dog',
          meta: {},
          mimeType: 'image/png',
        })
      )
      .expect(200);
    disposables.push(async () => {
      await request
        .delete(root, `/api/files/files/${fileKind}/${result.body.file.id}`)
        .send()
        .expect(200);
    });
    return result.body.file;
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

  const cleanupAfterEach = async () => {
    await Promise.all(disposables.map((dispose) => dispose()));
    disposables = [];
    await esClient.indices.delete({ index: testIndex, ignore_unavailable: true });
  };

  const cleanupAfterAll = async () => {
    await root.shutdown();
    await manageES.stop();
  };

  const manageES = await startES();

  const root = createRootWithCorePlugins(testConfig, { oss: false });
  await root.preboot();
  await root.setup();
  const coreStart = await root.start();
  const esClient = coreStart.elasticsearch.client.asInternalUser;

  await pRetry(() => request.get(root, '/api/licensing/info').expect(200), { retries: 5 });

  return {
    manageES,
    esClient,
    root,
    coreStart,
    fileKind,
    testIndex,
    request,
    createFile,
    cleanupAfterEach,
    cleanupAfterAll,
  };
}
