/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { UpdatableFileAttributes } from '../../../../common/types';
import { setupIntegrationEnvironment, TestEnvironmentUtils } from '../../tests';

describe('File kind HTTP API', () => {
  let fileKind: string;
  let createFile: TestEnvironmentUtils['createFile'];
  let root: TestEnvironmentUtils['root'];
  let request: TestEnvironmentUtils['request'];
  let testHarness: TestEnvironmentUtils;

  beforeAll(async () => {
    testHarness = await setupIntegrationEnvironment();
    ({ createFile, root, request, fileKind } = testHarness);
  });

  afterAll(async () => {
    await testHarness.cleanupAfterAll();
  });

  afterEach(async () => {
    await testHarness.cleanupAfterEach();
  });

  test('create', async () => {
    expect(await createFile()).toEqual({
      id: expect.any(String),
      created: expect.any(String),
      updated: expect.any(String),
      name: 'myFile',
      fileKind,
      status: 'AWAITING_UPLOAD',
      mimeType: 'image/png',
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
