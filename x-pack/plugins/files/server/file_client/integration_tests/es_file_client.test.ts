/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { Readable } from 'stream';
import { loggingSystemMock } from '@kbn/core/server/mocks';
import { TestEnvironmentUtils, setupIntegrationEnvironment } from '../../test_utils';
import { createEsFileClient } from '../create_es_file_client';
import { FileClient } from '../file_client';

/**
 * This file client is using Elasticsearch interfaces directly to manage files.
 */
describe('ES index-backed file client', () => {
  let esClient: TestEnvironmentUtils['esClient'];
  let fileClient: FileClient;

  beforeAll(async () => {
    ({ esClient } = await setupIntegrationEnvironment());
  });

  beforeEach(() => {
    fileClient = createEsFileClient({
      blobStorageIndex: '.kibana-test-blob',
      metadataIndex: '.kibana-test-metadata',
      elasticsearchClient: esClient,
      logger: loggingSystemMock.create().get(),
    });
  });

  test('create a new file', async () => {
    const file = await fileClient.create({
      id: '123',
      metadata: {
        Status: 'AWAITING_UPLOAD',
        created: new Date().toISOString(),
        Updated: new Date().toISOString(),
        name: 'cool name',
      },
    });
    expect(file).toEqual(
      expect.objectContaining({
        id: '123',
        metadata: {
          FileKind: 'no-file-kind',
          Status: 'AWAITING_UPLOAD',
          Updated: expect.any(String),
          created: expect.any(String),
          name: 'cool name',
        },
      })
    );
    await fileClient.delete({ id: file.id, hasContent: false });
  });

  test('uploads and downloads file content', async () => {
    let { id, metadata } = await fileClient.create({
      id: '123',
      metadata: {
        Status: 'AWAITING_UPLOAD',
        created: new Date().toISOString(),
        Updated: new Date().toISOString(),
        name: 'cool name',
      },
    });

    const { size } = await fileClient.upload(Readable.from(['test']));
    ({ id, metadata } = await fileClient.update({
      id,
      metadata: { ...metadata, size, Status: 'READY' },
    }));
    const rs = await fileClient.download({ id });
    const chunks = [];
    for await (const chunk of rs) {
      chunks.push(chunk);
    }
    expect(chunks.join('')).toBe('test');

    await fileClient.delete({ id, hasContent: true });
  });

  test('searches across files', async () => {
    await fileClient.create({
      id: '123',
      metadata: {
        Status: 'AWAITING_UPLOAD',
        created: new Date().toISOString(),
        Updated: new Date().toISOString(),
        name: 'cool name 1',
        Meta: {
          test: 1,
        },
      },
    });
    await fileClient.create({
      id: '1234',
      metadata: {
        Status: 'READY',
        created: new Date().toISOString(),
        Updated: new Date().toISOString(),
        name: 'cool name 2',
        Meta: {
          test: 2,
        },
      },
    });
    const { id: id3 } = await fileClient.create({
      id: '12345',
      metadata: {
        Status: 'READY',
        created: new Date().toISOString(),
        Updated: new Date().toISOString(),
        name: 'cool name 3',
        Meta: {
          test: 3,
        },
      },
    });

    const results = await fileClient.find({
      status: ['READY'],
      meta: { test: 3 },
    });

    expect(results).toHaveLength(1);

    expect(results[0]).toEqual(
      expect.objectContaining({
        id: id3,
      })
    );
  });
});
