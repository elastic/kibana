/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { CoreStart, ElasticsearchClient } from '@kbn/core/server';
import {
  createTestServers,
  createRootWithCorePlugins,
  TestElasticsearchUtils,
} from '@kbn/core/test_helpers/kbn_server';
import { Readable } from 'stream';

import type { FileStatus, File } from '../../common';

import { BlobStorageService } from '../blob_storage_service';
import { InternalFileService } from '../file_service';

describe('FileService', () => {
  const fileKind: string = 'test';

  let manageES: TestElasticsearchUtils;
  let kbnRoot: ReturnType<typeof createRootWithCorePlugins>;
  let fileService: InternalFileService;
  let blobStorageService: BlobStorageService;
  let esClient: ElasticsearchClient;
  let coreSetup: Awaited<ReturnType<typeof kbnRoot.setup>>;
  let coreStart: CoreStart;

  let disposables: File[] = [];
  const createFile: typeof fileService.createFile = async (args) => {
    const file = await fileService.createFile(args);
    disposables.push(file);
    return file;
  };

  beforeAll(async () => {
    const { startES } = createTestServers({ adjustTimeout: jest.setTimeout });
    manageES = await startES();
    kbnRoot = createRootWithCorePlugins();
    await kbnRoot.preboot();
    coreSetup = await kbnRoot.setup();
    InternalFileService.setup(coreSetup.savedObjects);
    coreStart = await kbnRoot.start();
    esClient = coreStart.elasticsearch.client.asInternalUser;
  });

  afterAll(async () => {
    await kbnRoot.shutdown();
    await manageES.stop();
  });

  beforeEach(() => {
    blobStorageService = new BlobStorageService(esClient, kbnRoot.logger.get('test-blob-service'));
    fileService = new InternalFileService(
      coreStart.savedObjects,
      blobStorageService,
      kbnRoot.logger.get('test-file-service')
    );
  });

  afterEach(async () => {
    await Promise.all(disposables.map((file) => file.delete()));
    const results = await fileService.list({ fileKind });
    expect(results.length).toBe(0);
    disposables = [];
  });

  it('creates file metadata', async () => {
    const file = await createFile({ fileKind, name: 'test' });
    expect(file.getMetadata()).toEqual(
      expect.objectContaining({
        created_at: expect.any(String),
        updated_at: expect.any(String),
        name: 'test',
        file_kind: 'test',
      })
    );
    expect(file.status).toBe('AWAITING_UPLOAD' as FileStatus);
  });

  it('uploads file content', async () => {
    const file = await createFile({ fileKind, name: 'test' });
    await file.uploadContent(Readable.from(['upload this']));
    const rs = await file.downloadContent();
    const chunks: string[] = [];
    for await (const chunk of rs) {
      chunks.push(chunk);
    }
    expect(chunks.join('')).toBe('upload this');
  });

  it('retrieves a file', async () => {
    const { id } = await createFile({ fileKind, name: 'test' });
    const myFile = await fileService.find({ id, fileKind });
    expect(myFile?.id).toMatch(id);
  });

  it('lists files', async () => {
    await Promise.all([
      createFile({ fileKind, name: 'test-1' }),
      createFile({ fileKind, name: 'test-2' }),
      createFile({ fileKind, name: 'test-3' }),
      createFile({ fileKind, name: 'test-3' /* Also test file with same name */ }),
    ]);
    const result = await fileService.list({ fileKind });
    expect(result.length).toBe(4);
  });

  it('deletes files', async () => {
    const file = await fileService.createFile({ fileKind, name: 'test' });
    await file.delete();
  });
});
