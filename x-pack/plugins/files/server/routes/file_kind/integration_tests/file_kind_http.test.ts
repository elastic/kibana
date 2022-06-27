/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { defaults } from 'lodash';
import { CoreStart, ElasticsearchClient } from '@kbn/core/server';
import pRetry from 'p-retry';
import {
  createTestServers,
  createRootWithCorePlugins,
  TestElasticsearchUtils,
  request,
} from '@kbn/core/test_helpers/kbn_server';

import type { FileJSON, UpdatableFileAttributes } from '../../../../common/types';
import { fileKindsRegistry } from '../../../file_kinds_registry';

describe('File kind HTTP API', () => {
  const fileKind: string = 'test-file-kind';
  const testIndex = '.kibana-test-files';
  const testConfig = {
    xpack: {
      reporting: { enabled: false },
    },
  };

  let manageES: TestElasticsearchUtils;
  let root: ReturnType<typeof createRootWithCorePlugins>;
  let esClient: ElasticsearchClient;
  let coreStart: CoreStart;

  beforeAll(async () => {
    fileKindsRegistry.register({
      id: fileKind,
      blobStoreSettings: {
        esSingleIndex: { index: testIndex },
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
    manageES = await startES();
    root = createRootWithCorePlugins(testConfig, { oss: false });
    await root.preboot();
    await root.setup();
    coreStart = await root.start();
    esClient = coreStart.elasticsearch.client.asInternalUser;

    await pRetry(() => request.get(root, '/api/licensing/info').expect(200), { retries: 5 });
  });

  afterAll(async () => {
    await root.shutdown();
    await manageES.stop();
  });

  let disposables: Array<() => Promise<void>> = [];
  afterEach(async () => {
    await Promise.all(disposables.map((dispose) => dispose()));
    disposables = [];
    await esClient.indices.delete({ index: testIndex, ignore_unavailable: true });
  });

  const createFile = async (
    fileAttrs: Partial<{ name: string; alt: string; meta: Record<string, any>; mime: string }> = {}
  ): Promise<FileJSON> => {
    const result = await request
      .post(root, `/api/files/files/${fileKind}`)
      .send(
        defaults(fileAttrs, {
          name: 'myFile',
          alt: 'a picture of my dog',
          meta: {},
          mime: 'image/png',
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

  test('create', async () => {
    expect(await createFile()).toEqual({
      id: expect.any(String),
      created_at: expect.any(String),
      updated_at: expect.any(String),
      name: 'myFile',
      file_kind: fileKind,
      status: 'AWAITING_UPLOAD',
      mime: 'image/png',
      extension: 'png',
      meta: {},
      alt: 'a picture of my dog',
    });
  });

  test('upload', async () => {
    const { id } = await createFile();
    const result = await request
      .put(root, `/api/files/files/${fileKind}/${id}/blob`)
      .set('Content-Type', 'application/octet-stream')
      .send('what have you')
      .expect(200);
    expect(result.body).toEqual({ ok: true });
  });

  test('download', async () => {
    const { id } = await createFile({ name: 'test' });
    await request
      .put(root, `/api/files/files/${fileKind}/${id}/blob`)
      .set('content-type', 'application/octet-stream')
      .send('what have you')
      .expect(200);

    const { body: buffer, header } = await request
      .get(root, `/api/files/files/${fileKind}/${id}/blob`)
      .set('accept', 'application/octet-stream')
      .buffer()
      .expect(200);

    expect(header['content-type']).toEqual('image/png');
    expect(header['content-disposition']).toEqual('attachment; filename="test.png"');
    expect(buffer.toString('utf8')).toEqual('what have you');
  });

  test('update', async () => {
    const { id } = await createFile({ name: 'acoolfilename' });

    const {
      body: { file },
    } = await request.get(root, `/api/files/files/${fileKind}/${id}`).expect(200);
    expect(file.name).toBe('acoolfilename');

    const updatedFileAttrs: UpdatableFileAttributes = {
      name: 'anothercoolfilename',
      alt: 'a picture of my cat',
      meta: {
        something: 'new',
      },
    };

    const {
      body: { file: updatedFile },
    } = await request
      .patch(root, `/api/files/files/${fileKind}/${id}`)
      .send(updatedFileAttrs)
      .expect(200);

    expect(updatedFile).toEqual(expect.objectContaining(updatedFileAttrs));

    const {
      body: { file: file2 },
    } = await request.get(root, `/api/files/files/${fileKind}/${id}`).expect(200);

    expect(file2).toEqual(expect.objectContaining(updatedFileAttrs));
  });

  test('list', async () => {
    const nrOfFiles = 10;
    await Promise.all([...Array(nrOfFiles).keys()].map(() => createFile({ name: 'test' })));

    const {
      body: { files },
    } = await request.get(root, `/api/files/files/${fileKind}/list`).expect(200);

    expect(files).toHaveLength(nrOfFiles);
    expect(files[0]).toEqual(expect.objectContaining({ name: 'test' }));

    const {
      body: { files: files2 },
    } = await request.get(root, `/api/files/files/${fileKind}/list?page=1&perPage=5`).expect(200);
    expect(files2).toHaveLength(5);
  });
});
