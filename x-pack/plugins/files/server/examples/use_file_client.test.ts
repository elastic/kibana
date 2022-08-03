/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { promisify } from 'util';
import { pipeline } from 'stream';
import { createWriteStream } from 'fs';

import { elasticsearchServiceMock, loggingSystemMock } from '@kbn/core/server/mocks';
import { createEsFileClient } from '../file_client';

async function myFilesExample() {
  const logger = loggingSystemMock.createLogger();
  const elasticsearchClient = elasticsearchServiceMock.createElasticsearchClient();

  /**
   * Instantiate the client
   */
  const fileClient = createEsFileClient({
    blobStorageIndex: 'my-contents-index',
    metadataIndex: 'my-metadata-index',
    elasticsearchClient,
    maxSizeBytes: 1000,
    logger,
  });

  /**
   * Download a file
   */
  const rs = await fileClient.download({ id: 'myfileId' });
  const ws = createWriteStream('./test');
  await promisify(pipeline)(rs, ws);

  /**
   * Delete the file
   */
  await fileClient.delete({ id: 'myfileId', hasContent: true });
}
