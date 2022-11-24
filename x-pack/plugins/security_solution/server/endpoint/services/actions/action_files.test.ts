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
import { getFileDownloadStream, getFileInfo } from './action_files';
import type { DiagnosticResult } from '@elastic/elasticsearch';
import { errors } from '@elastic/elasticsearch';
import { NotFoundError } from '../../errors';
import { FILE_STORAGE_DATA_INDEX } from '../../../../common/endpoint/constants';
import { BaseDataGenerator } from '../../../../common/endpoint/data_generators/base_data_generator';
import type * as estypes from '@elastic/elasticsearch/lib/api/typesWithBodyKey';

jest.mock('@kbn/files-plugin/server');
const createEsFileClient = _createEsFileClient as jest.Mock;

describe('Action Files service', () => {
  let loggerMock: Logger;
  let esClientMock: ElasticsearchClientMock;
  let fileClientMock: ReturnType<typeof createFileClientMock>;

  beforeEach(() => {
    loggerMock = loggingSystemMock.create().get('mock');
    esClientMock = elasticsearchServiceMock.createElasticsearchClient();
    fileClientMock = createFileClientMock();
    createEsFileClient.mockReturnValue(fileClientMock);
  });

  describe('#getFileDownloadStream()', () => {
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

  describe('#getFileInfo()', () => {
    let fileChunksEsResponseMock: estypes.SearchResponse;

    beforeEach(() => {
      fileChunksEsResponseMock = BaseDataGenerator.toEsSearchResponse([
        BaseDataGenerator.toEsSearchHit({}),
      ]);

      esClientMock.search.mockImplementation(async (searchRequest) => {
        if (searchRequest && searchRequest.index === FILE_STORAGE_DATA_INDEX) {
          return fileChunksEsResponseMock;
        }

        return BaseDataGenerator.toEsSearchResponse([]);
      });
    });

    it('should return expected output', async () => {
      await expect(getFileInfo(esClientMock, loggerMock, '123')).resolves.toEqual({
        created: '2022-10-10T14:57:30.682Z',
        id: '123',
        mimeType: 'text/plain',
        name: 'test.txt',
        size: 1234,
        status: 'READY',
      });
    });

    it('should check if file has chunks if status is `READY`', async () => {
      fileChunksEsResponseMock = BaseDataGenerator.toEsSearchResponse([]);

      await expect(getFileInfo(esClientMock, loggerMock, '123')).resolves.toEqual({
        created: '2022-10-10T14:57:30.682Z',
        id: '123',
        mimeType: 'text/plain',
        name: 'test.txt',
        size: 1234,
        status: 'DELETED',
      });

      expect(loggerMock.debug).toHaveBeenCalledWith(
        'File with id [123] has no data chunks. Status will be adjusted to DELETED'
      );
    });

    it('should return a `NotFoundError` if file id is not found', async () => {
      fileClientMock.get.mockRejectedValue(
        new errors.ResponseError({
          statusCode: 404,
        } as DiagnosticResult)
      );

      await expect(getFileInfo(esClientMock, loggerMock, '123')).rejects.toBeInstanceOf(
        NotFoundError
      );
    });
  });
});
