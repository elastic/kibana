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

import type { FileStatus, File } from '../../../common';

import { BlobStorageService } from '../../blob_storage_service';
import { FileServiceFactory } from '..';
import { FileServiceStart } from '../file_service';
import { CreateFileArgs } from '../internal_file_service';

describe('FileService', () => {
  const fileKind: string = 'test';

  let manageES: TestElasticsearchUtils;
  let kbnRoot: ReturnType<typeof createRootWithCorePlugins>;
  let fileService: FileServiceStart;
  let blobStorageService: BlobStorageService;
  let esClient: ElasticsearchClient;
  let coreSetup: Awaited<ReturnType<typeof kbnRoot.setup>>;
  let coreStart: CoreStart;
  let fileServiceFactory: FileServiceFactory;

  beforeAll(async () => {
    const { startES } = createTestServers({ adjustTimeout: jest.setTimeout });
    manageES = await startES();
    kbnRoot = createRootWithCorePlugins();
    await kbnRoot.preboot();
    coreSetup = await kbnRoot.setup();
    FileServiceFactory.setup(coreSetup.savedObjects);
    coreStart = await kbnRoot.start();
    esClient = coreStart.elasticsearch.client.asInternalUser;
  });

  afterAll(async () => {
    await kbnRoot.shutdown();
    await manageES.stop();
  });

  beforeEach(() => {
    blobStorageService = new BlobStorageService(esClient, kbnRoot.logger.get('test-blob-service'));
    fileServiceFactory = new FileServiceFactory(
      coreStart.savedObjects,
      blobStorageService,
      undefined, // skip security for these tests
      kbnRoot.logger.get('test-file-service')
    );
    fileService = fileServiceFactory.asInternal();
  });

  let disposables: File[] = [];
  async function createDisposableFile<M = unknown>(args: CreateFileArgs<M>) {
    const file = await fileService.create(args);
    disposables.push(file);
    return file;
  }
  afterEach(async () => {
    await Promise.all(disposables.map((file) => file.delete()));
    const results = await fileService.list({ fileKind });
    expect(results.length).toBe(0);
    disposables = [];
  });

  it('creates file metadata awaiting upload', async () => {
    const file = await createDisposableFile({ fileKind, name: 'test' });
    expect(file.name).toEqual('test');
    expect(file.fileKind).toEqual(fileKind);
    expect(file.status).toBe('AWAITING_UPLOAD' as FileStatus);
  });

  it('uploads file content', async () => {
    const file = await createDisposableFile({ fileKind, name: 'test' });
    expect(file.status).toBe('AWAITING_UPLOAD' as FileStatus);
    await file.uploadContent(Readable.from(['upload this']));
    expect(file.status).toBe('READY' as FileStatus);
    const rs = await file.downloadContent();
    const chunks: string[] = [];
    for await (const chunk of rs) {
      chunks.push(chunk);
    }
    expect(chunks.join('')).toBe('upload this');
  });

  it('retrieves a file', async () => {
    const { id } = await createDisposableFile({ fileKind, name: 'test' });
    const myFile = await fileService.find({ id, fileKind });
    expect(myFile?.id).toMatch(id);
  });

  it('lists files', async () => {
    await Promise.all([
      createDisposableFile({ fileKind, name: 'test-1' }),
      createDisposableFile({ fileKind, name: 'test-2' }),
      createDisposableFile({ fileKind, name: 'test-3' }),
      createDisposableFile({ fileKind, name: 'test-3' /* Also test file with same name */ }),
    ]);
    const result = await fileService.list({ fileKind });
    expect(result.length).toBe(4);
  });

  it('deletes files', async () => {
    const file = await fileService.create({ fileKind, name: 'test' });
    const files = await fileService.list({ fileKind });
    expect(files.length).toBe(1);
    await file.delete();
    expect(await fileService.list({ fileKind })).toEqual([]);
  });

  interface CustomMeta {
    some: string;
  }
  it('updates files', async () => {
    const file = await createDisposableFile<CustomMeta>({ fileKind, name: 'test' });
    const updatableFields = {
      name: 'new name',
      alt: 'my alt text',
      meta: { some: 'data' },
    };
    const updatedFile1 = await file.update(updatableFields);
    expect(updatedFile1.meta).toEqual(expect.objectContaining(updatableFields.meta));
    expect(updatedFile1.name).toBe(updatableFields.name);
    expect(updatedFile1.alt).toBe(updatableFields.alt);

    // Fetch the file anew to be doubly sure
    const updatedFile2 = await fileService.find<CustomMeta>({ fileKind, id: file.id });
    expect(updatedFile2.meta).toEqual(expect.objectContaining(updatableFields.meta));
    // Below also tests that our meta type is work as expected by using `some` field.
    expect(updatedFile2.meta.some).toBe(updatableFields.meta.some);
    expect(updatedFile2.name).toBe(updatableFields.name);
    expect(updatedFile2.alt).toBe(updatableFields.alt);
  });
});
