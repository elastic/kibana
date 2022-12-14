/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClientMock } from '@kbn/core/server/mocks';
import { elasticsearchServiceMock } from '@kbn/core/server/mocks';

import {
  FILE_STORAGE_DATA_INDEX_PATTERN,
  FILE_STORAGE_METADATA_INDEX_PATTERN,
} from '../../../common/constants/file_storage';

import { getFileDataIndexName, getFileMetadataIndexName } from '../../../common/services';

import { ES_SEARCH_LIMIT } from '../../../common/constants';

import { fileIdsWithoutChunksByIndex, getFilesByStatus, updateFilesStatus } from '.';

const ENDPOINT_FILE_METADATA_INDEX = getFileMetadataIndexName('endpoint');
const ENDPOINT_FILE_INDEX = getFileDataIndexName('endpoint');

describe('files service', () => {
  let esClientMock: ElasticsearchClientMock;
  const abortController = new AbortController();

  beforeEach(() => {
    esClientMock = elasticsearchServiceMock.createElasticsearchClient();
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  describe('#getFilesByStatus()', () => {
    it('should return expected values', async () => {
      const status = 'READY';
      esClientMock.search.mockResolvedValueOnce({
        took: 5,
        timed_out: false,
        _shards: {
          total: 1,
          successful: 1,
          skipped: 0,
          failed: 0,
        },
        hits: {
          hits: [
            {
              _index: ENDPOINT_FILE_METADATA_INDEX,
              _id: 'someid1',
            },
            {
              _index: ENDPOINT_FILE_METADATA_INDEX,
              _id: 'someid2',
            },
          ],
        },
      });

      const result = await getFilesByStatus(esClientMock, abortController, status);

      expect(esClientMock.search).toBeCalledWith(
        {
          index: FILE_STORAGE_METADATA_INDEX_PATTERN,
          body: {
            size: ES_SEARCH_LIMIT,
            query: {
              term: {
                'file.Status': status,
              },
            },
            _source: false,
          },
          ignore_unavailable: true,
        },
        { signal: abortController.signal }
      );
      expect(result).toEqual([
        { _index: ENDPOINT_FILE_METADATA_INDEX, _id: 'someid1' },
        { _index: ENDPOINT_FILE_METADATA_INDEX, _id: 'someid2' },
      ]);
    });
  });

  describe('#fileIdsWithoutChunks()', () => {
    it('should return expected values', async () => {
      esClientMock.search.mockResolvedValueOnce({
        took: 5,
        timed_out: false,
        _shards: {
          total: 1,
          successful: 1,
          skipped: 0,
          failed: 0,
        },
        hits: {
          hits: [
            {
              _index: ENDPOINT_FILE_INDEX,
              _id: 'keep1',
              _source: {
                bid: 'keep1',
              },
            },
            {
              _index: ENDPOINT_FILE_INDEX,
              _id: 'keep2',
              _source: {
                bid: 'keep2',
              },
            },
          ],
        },
      });

      const files = [
        { _index: ENDPOINT_FILE_METADATA_INDEX, _id: 'keep1' },
        { _index: ENDPOINT_FILE_METADATA_INDEX, _id: 'keep2' },
        { _index: ENDPOINT_FILE_METADATA_INDEX, _id: 'delete1' },
        { _index: ENDPOINT_FILE_METADATA_INDEX, _id: 'delete2' },
      ];
      const { fileIdsByIndex: deletedFileIdsByIndex, allFileIds: allDeletedFileIds } =
        await fileIdsWithoutChunksByIndex(esClientMock, abortController, files);

      expect(esClientMock.search).toBeCalledWith(
        {
          index: FILE_STORAGE_DATA_INDEX_PATTERN,
          body: {
            size: ES_SEARCH_LIMIT,
            query: {
              bool: {
                must: [
                  {
                    terms: {
                      bid: Array.from(files.map((file) => file._id)),
                    },
                  },
                  {
                    term: {
                      last: true,
                    },
                  },
                ],
              },
            },
            _source: ['bid'],
          },
        },
        { signal: abortController.signal }
      );
      expect(deletedFileIdsByIndex).toEqual({
        [ENDPOINT_FILE_METADATA_INDEX]: new Set(['delete1', 'delete2']),
      });
      expect(allDeletedFileIds).toEqual(new Set(['delete1', 'delete2']));
    });
  });

  describe('#updateFilesStatus()', () => {
    it('calls esClient.updateByQuery with expected values', () => {
      const FAKE_INTEGRATION_METADATA_INDEX = getFileMetadataIndexName('someintegration');
      const files = {
        [ENDPOINT_FILE_METADATA_INDEX]: new Set(['delete1', 'delete2']),
        [FAKE_INTEGRATION_METADATA_INDEX]: new Set(['delete2', 'delete3']),
      };
      const status = 'DELETED';
      updateFilesStatus(esClientMock, abortController, files, status);

      expect(esClientMock.updateByQuery).toHaveBeenNthCalledWith(
        1,
        {
          index: ENDPOINT_FILE_METADATA_INDEX,
          refresh: true,
          query: {
            ids: {
              values: Array.from(files[ENDPOINT_FILE_METADATA_INDEX]),
            },
          },
          script: {
            source: `ctx._source.file.Status = '${status}'`,
            lang: 'painless',
          },
        },
        { signal: abortController.signal }
      );
      expect(esClientMock.updateByQuery).toHaveBeenNthCalledWith(
        2,
        {
          index: FAKE_INTEGRATION_METADATA_INDEX,
          refresh: true,
          query: {
            ids: {
              values: Array.from(files[FAKE_INTEGRATION_METADATA_INDEX]),
            },
          },
          script: {
            source: `ctx._source.file.Status = '${status}'`,
            lang: 'painless',
          },
        },
        { signal: abortController.signal }
      );
    });
  });
});
