/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClientMock } from '@kbn/core/server/mocks';
import { elasticsearchServiceMock, loggingSystemMock } from '@kbn/core/server/mocks';
import type { Logger } from '@kbn/core/server';
import { createEsFileClient as _createEsFileClient } from '@kbn/files-plugin/server';
import { createFileClientMock } from '@kbn/files-plugin/server/mocks';
import { getFileDownloadStream } from './action_files';
import type { DiagnosticResult } from '@elastic/elasticsearch';
import { errors } from '@elastic/elasticsearch';
import { NotFoundError } from '../../errors';

jest.mock('@kbn/files-plugin/server');
const createEsFileClient = _createEsFileClient as jest.Mock;

describe('Action Files service', () => {
  describe('#getFileDownloadStream()', () => {
    let loggerMock: Logger;
    let esClientMock: ElasticsearchClientMock;
    let fileClientMock: ReturnType<typeof createFileClientMock>;

    beforeEach(() => {
      loggerMock = loggingSystemMock.create().get('mock');
      esClientMock = elasticsearchServiceMock.createElasticsearchClient();
      fileClientMock = createFileClientMock();
      createEsFileClient.mockReturnValue(fileClientMock);
    });

    it('should return expected output', async () => {
      await expect(getFileDownloadStream(esClientMock, loggerMock, '123')).resolves.toEqual({
        stream: expect.anything(),
        fileName: 'test.txt',
        mimeType: 'text/plain',
      });
    });

    it('should return NotFoundError if file or index is not found', async () => {
      fileClientMock.get.mockRejectedValue(
        new errors.ResponseError({
          statusCode: 404,
        } as DiagnosticResult)
      );

      await expect(getFileDownloadStream(esClientMock, loggerMock, '123')).rejects.toBeInstanceOf(
        NotFoundError
      );
    });
  });
});
