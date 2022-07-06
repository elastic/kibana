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

import { fileKindsRegistry } from '../file_kinds_registry';
import { BlobStorageService } from '../blob_storage_service';
import { FileServiceFactory } from '../file_service';
import { FileServiceStart } from '../file_service/file_service';
import { CreateFileArgs } from '../file_service/internal_file_service';

describe('FileService', () => {
  const fileKind: string = 'test';
  const fileKindNonDefault: string = 'test-non-default';
  const fileKindTinyFiles: string = 'tiny-files';
  const nonDefaultIndex = '.kibana-test-files';

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
    fileKindsRegistry.register({
      id: fileKind,
      http: {},
    });
    fileKindsRegistry.register({
      id: fileKindNonDefault,
      http: {},
      blobStoreSettings: { esFixedSizeIndex: { index: nonDefaultIndex } },
    });
    fileKindsRegistry.register({
      id: fileKindTinyFiles,
      maxSizeBytes: 10,
      http: {},
    });
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
      fileKindsRegistry,
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

  it('enforces max size settings', async () => {
    const file = await createDisposableFile({ fileKind: fileKindTinyFiles, name: 'test' });
    const tinyContent = Readable.from(['ok']);
    await file.uploadContent(tinyContent);

    const file2 = await createDisposableFile({ fileKind: fileKindTinyFiles, name: 'test' });
    const notSoTinyContent = Readable.from(['nok'.repeat(10)]);
    await expect(() => file2.uploadContent(notSoTinyContent)).rejects.toThrow(
      new Error('Maximum of 10 bytes exceeded')
    );
  });

  describe('ES blob integration and file kinds', () => {
    it('passes blob store settings', async () => {
      const file = await createDisposableFile({ fileKind: fileKindNonDefault, name: 'test' });
      expect(await esClient.indices.exists({ index: nonDefaultIndex })).toBe(false);
      await file.uploadContent(Readable.from(['test']));
      expect(await esClient.indices.exists({ index: nonDefaultIndex })).toBe(true);
    });
  });

  describe('Sharing files', () => {
    it('creates a file share object', async () => {
      const file = await createDisposableFile({ fileKind, name: 'test' });
      const shareObject = await file.share({ name: 'test name' });
      expect(shareObject).toEqual(
        expect.objectContaining({
          id: expect.any(String),
          name: 'test name',
          valid_until: expect.any(Number),
          created_at: expect.any(String),
        })
      );
    });

    it('retrieves a a file share object', async () => {
      const file = await createDisposableFile({ fileKind, name: 'test' });
      const { id } = await file.share({ name: 'my file share' });
      const shareService = fileService.getFileShareService();
      // Check if a file share exists without using an {@link File} object
      const result = await shareService.get({ tokenId: id });
      expect(result).toEqual(
        expect.objectContaining({
          id: expect.any(String),
          name: 'my file share',
          valid_until: expect.any(Number),
          created_at: expect.any(String),
        })
      );
    });

    it('updates a file share object', async () => {
      const file = await createDisposableFile({ fileKind, name: 'test' });
      const { id } = await file.share({ name: 'my file share 1' });
      const shareService = fileService.getFileShareService();
      // Check if a file share exists without using an {@link File} object
      await shareService.update({ id, attributes: { name: 'my file share 2' } });
      const result = await shareService.get({ tokenId: id });
      expect(result).toEqual(
        expect.objectContaining({
          id: expect.any(String),
          name: 'my file share 2',
          valid_until: expect.any(Number),
          created_at: expect.any(String),
        })
      );
    });

    it('lists all file share objects for a file', async () => {
      const [file, file2] = await Promise.all([
        createDisposableFile({ fileKind, name: 'test' }),
        createDisposableFile({ fileKind, name: 'anothertest' }),
      ]);

      const [share1] = await Promise.all([
        file.share({ name: 'my file share 1' }),
        file.share({ name: 'my file share 2' }),
        file.share({ name: 'my file share 3' }),

        file2.share({ name: 'my file share 1' }),
        file2.share({ name: 'my file share 2' }),
        file2.share({ name: 'my file share 3' }),
      ]);

      // Check whether updating file attributes interferes with SO references.
      const shareService = fileService.getFileShareService();
      await shareService.update({ id: share1.id, attributes: { name: 'my file share X' } });

      const shares1 = await file.listShares();
      expect(shares1).toHaveLength(3);
      expect(shares1[0]).toEqual(
        expect.objectContaining({
          id: expect.any(String),
          fileId: file.id,
        })
      );
      const shares2 = await file2.listShares();
      expect(await file2.listShares()).toHaveLength(3);
      expect(shares2[0]).toEqual(
        expect.objectContaining({
          id: expect.any(String),
          fileId: file2.id,
        })
      );
    });

    it('deletes a file share object', async () => {
      const file = await createDisposableFile({ fileKind, name: 'myfile' });
      const { id } = await file.share({ name: 'my file share' });
      expect(await file.listShares()).toHaveLength(1);
      await file.unshare({ shareId: id });
      expect(await file.listShares()).toEqual([]);
    });
  });
});
