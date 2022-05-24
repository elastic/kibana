/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { ElasticsearchClient, ISavedObjectsRepository } from '@kbn/core/server';
import { createSandbox } from 'sinon';
import {
  elasticsearchServiceMock,
  loggingSystemMock,
  savedObjectsServiceMock,
} from '@kbn/core/server/mocks';
import { Readable } from 'stream';

import { BlobStorageService } from '../blob_storage_service';
import { InternalFileService } from '../file_service/internal_file_service';

describe('File', () => {
  let esClient: ElasticsearchClient;
  let fileService: InternalFileService;
  let blobStorageService: BlobStorageService;
  let soClient: ISavedObjectsRepository;

  const sandbox = createSandbox();

  beforeEach(() => {
    esClient = elasticsearchServiceMock.createInternalClient();
    soClient = savedObjectsServiceMock.createStartContract().createInternalRepository();
    const logger = loggingSystemMock.createLogger();
    blobStorageService = new BlobStorageService(esClient, logger);
    fileService = new InternalFileService('test', soClient, blobStorageService, undefined, logger);
  });

  afterEach(() => {
    sandbox.restore();
  });

  it('deletes file content when an upload fails', async () => {
    const spy = sandbox.spy(blobStorageService, 'delete');

    (esClient.index as jest.Mock).mockRejectedValue(new Error('test'));
    const fileSO = { attributes: { status: 'AWAITING_UPLOAD' } };
    (soClient.create as jest.Mock).mockResolvedValue(fileSO);
    (soClient.update as jest.Mock).mockResolvedValue(fileSO);

    const file = await fileService.createFile({ name: 'test', fileKind: 'fileKind' });
    await expect(file.uploadContent(Readable.from(['test']))).rejects.toThrow(new Error('test'));
    expect(spy.calledOnce).toBe(true);
  });
});
