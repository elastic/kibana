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

  beforeEach(() => {
    esBlobStorage = new ElasticsearchBlobStorage(
      esClient,
      undefined,
      manageKbn.root.logger.get('es-blob-test')
    );
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
    expect((esClient.get as sinon.SinonSpy).calledTwice).toBe(true);
  });

  it('uploads and removes file content', async () => {
    const { id } = await esBlobStorage.upload(Readable.from(['upload this']));
    const getAllDocCount = async () => {
      await esClient.indices.refresh({ index: BLOB_STORAGE_SYSTEM_INDEX_NAME });
      return esClient.count({
        index: BLOB_STORAGE_SYSTEM_INDEX_NAME,
        query: { match_all: {} },
      });
    };

    expect(await getAllDocCount()).toMatchObject({ count: 1 });
    await esBlobStorage.delete(id);
    expect(await getAllDocCount()).toMatchObject({ count: 0 });
  });
});
