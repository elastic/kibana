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
import { createFileClientMock, createFileMock } from '@kbn/files-plugin/server/mocks';
import { getFileDownloadStream, getFileInfo } from './action_files';
import type { DiagnosticResult } from '@elastic/elasticsearch';
import { errors } from '@elastic/elasticsearch';
import { NotFoundError } from '../../errors';
import { FILE_STORAGE_DATA_INDEX } from '../../../../common/endpoint/constants';
import { BaseDataGenerator } from '../../../../common/endpoint/data_generators/base_data_generator';
import type * as estypes from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import type { IlmGetLifecycleLifecycle } from '@elastic/elasticsearch/lib/api/types';

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
    let ilmPolicyMock: IlmGetLifecycleLifecycle;

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

      ilmPolicyMock = {
        version: 1,
        modified_date: '2022-11-01T19:56:10.124Z',
        policy: {
          phases: {
            hot: {
              min_age: '0ms',
              actions: {
                set_priority: {
                  priority: 100,
                },
                rollover: {
                  max_primary_shard_size: '50gb',
                  max_age: '30d',
                },
              },
            },
            delete: {
              min_age: '5d',
              actions: {
                delete: {
                  delete_searchable_snapshot: true,
                },
              },
            },
          },
        },
      };

      esClientMock.ilm.getLifecycle.mockImplementation(async () => {
        return {
          // FIXME:PT get policy name from fleet when available
          paul: ilmPolicyMock,
        };
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
        ttl: -1,
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
        ttl: -1,
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

    it('it should calculate TTL based on ILM policy', async () => {
      const file = createFileMock();
      const createdDate = new Date();

      createdDate.setHours(1, 0, 0, 0);

      // When Moment is called with no date string, `Date.now` is used, so we mock this here
      // in order to ensure we get consistent test results
      const dateNowSpy = jest.spyOn(Date, 'now').mockReturnValue(createdDate.getTime());

      file.data.created = createdDate.toISOString();
      fileClientMock.get.mockResolvedValue(file);

      await expect(getFileInfo(esClientMock, loggerMock, '123')).resolves.toEqual(
        expect.objectContaining({ ttl: 5 })
      );

      dateNowSpy.mockRestore();
    });
  });
});
