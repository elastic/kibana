/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import sinon from 'sinon';
import { ElasticsearchClient } from '@kbn/core/server';
import { Readable } from 'stream';
import {
  createTestServers,
  TestElasticsearchUtils,
  TestKibanaUtils,
} from '@kbn/core/test_helpers/kbn_server';

import { ElasticsearchBlobStorage, BLOB_STORAGE_SYSTEM_INDEX_NAME } from '../es';

describe('Elasticsearch blob storage', () => {
  let manageES: TestElasticsearchUtils;
  let manageKbn: TestKibanaUtils;
  let esBlobStorage: ElasticsearchBlobStorage;
  let esClient: ElasticsearchClient;
  const sandbox = sinon.createSandbox();

  beforeAll(async () => {
    const { startES, startKibana } = createTestServers({ adjustTimeout: jest.setTimeout });
    manageES = await startES();
    manageKbn = await startKibana();
    esClient = manageKbn.coreStart.elasticsearch.client.asInternalUser;
  });

  afterAll(async () => {
    await manageKbn.root.shutdown();
    await manageKbn.stop();
    await manageES.stop();
  });

  const createEsBlobStorage = ({ chunkSize }: { chunkSize?: string } = {}) =>
    new ElasticsearchBlobStorage(
      esClient,
      undefined,
      chunkSize,
      manageKbn.root.logger.get('es-blob-test')
    );

  beforeEach(() => {
    esBlobStorage = createEsBlobStorage();
    sandbox.spy(esClient, 'get');
  });

  afterEach(async () => {
    await esClient.indices.delete({ index: BLOB_STORAGE_SYSTEM_INDEX_NAME });
    sandbox.restore();
  });

  it('sets up a new blob storage index after first write', async () => {
    expect(await esClient.indices.exists({ index: BLOB_STORAGE_SYSTEM_INDEX_NAME })).toBe(false);
    await esBlobStorage.upload(Readable.from(['upload this']));
    expect(await esClient.indices.exists({ index: BLOB_STORAGE_SYSTEM_INDEX_NAME })).toBe(true);
  });

  it('uploads and retrieves file content of known size', async () => {
    const { id, size } = await esBlobStorage.upload(Readable.from(['upload this']));
    const rs = await esBlobStorage.download({ id, size });
    const chunks: string[] = [];
    for await (const chunk of rs) {
      chunks.push(chunk);
    }
    expect(chunks.join('')).toBe('upload this');
    expect((esClient.get as sinon.SinonSpy).calledOnce).toBe(true);
  });

  /**
   * Test a case where, if, for whatever reason, the file size is unknown we should
   * still be able to download the file.
   */
  it('uploads and retrieves file content of unknown size', async () => {
    const { id } = await esBlobStorage.upload(Readable.from(['upload this']));
    const rs = await esBlobStorage.download({ id });
    const chunks: string[] = [];
    for await (const chunk of rs) {
      chunks.push(chunk);
    }
    expect(chunks.join('')).toBe('upload this');
    // Called twice because we did not know where the file contents end
    expect((esClient.get as sinon.SinonSpy).calledTwice).toBe(true);
  });

  it('uploads and downloads a file of many chunks', async () => {
    const fileString = 'upload this'.repeat(10);
    esBlobStorage = createEsBlobStorage({ chunkSize: '1028B' });
    const { id } = await esBlobStorage.upload(Readable.from([fileString]));
    expect(await getAllDocCount()).toMatchObject({ count: 37 });
    const rs = await esBlobStorage.download({ id });
    const chunks: string[] = [];
    for await (const chunk of rs) {
      chunks.push(chunk);
    }
    expect(chunks.join('')).toBe(fileString);
  });

  const getAllDocCount = async () => {
    await esClient.indices.refresh({ index: BLOB_STORAGE_SYSTEM_INDEX_NAME });
    return esClient.count({
      index: BLOB_STORAGE_SYSTEM_INDEX_NAME,
      query: { match_all: {} },
    });
  };

  it('uploads and removes file content', async () => {
    const { id } = await esBlobStorage.upload(Readable.from(['upload this']));
    expect(await getAllDocCount()).toMatchObject({ count: 1 });
    await esBlobStorage.delete(id);
    expect(await getAllDocCount()).toMatchObject({ count: 0 });
  });

  it('chunks files and then deletes all chunks when cleaning up', async () => {
    const fileString = 'upload this'.repeat(10);
    esBlobStorage = createEsBlobStorage({ chunkSize: '1028B' });
    const { id } = await esBlobStorage.upload(Readable.from([fileString]));
    const fileString2 = 'another file'.repeat(10);
    const { id: id2 } = await esBlobStorage.upload(Readable.from([fileString2]));
    expect(await getAllDocCount()).toMatchObject({ count: 77 });
    await esBlobStorage.delete(id);
    expect(await getAllDocCount()).toMatchObject({ count: 40 });
    // Now we check that the other file is still intact
    const rs = await esBlobStorage.download({ id: id2 });
    const chunks: string[] = [];
    for await (const chunk of rs) {
      chunks.push(chunk);
    }
    expect(chunks.join('')).toBe(fileString2);
  });
});
