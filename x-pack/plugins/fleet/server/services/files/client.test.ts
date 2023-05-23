/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Readable } from 'stream';

import type { ElasticsearchClientMock } from '@kbn/core-elasticsearch-client-server-mocks';
import { elasticsearchServiceMock } from '@kbn/core-elasticsearch-server-mocks';

import { loggingSystemMock } from '@kbn/core-logging-server-mocks';

import { createFileClientMock } from '@kbn/files-plugin/server/mocks';

import {
  createEsFileClient as _createEsFileClient,
  createFileHashTransform as _createFileHashTransform,
} from '@kbn/files-plugin/server';

import type { estypes } from '@elastic/elasticsearch';

import type { DeeplyMockedKeys } from '@kbn/utility-types-jest';

import type { File } from '@kbn/files-plugin/common';

import type { FleetFileTransferDirection, HapiReadableStream } from '../..';

import type { FileCustomMeta } from './types';

import { createFromHostEsSearchResponseMock, createHapiReadableStreamMock } from './mocks';

import { FleetFilesClient } from './client';
import type { HostUploadedFileMetadata } from './types';

jest.mock('@kbn/files-plugin/server');

const createEsFileClientMock = _createEsFileClient as jest.Mock;
const createFileHashTransformMock = _createFileHashTransform as jest.Mock;

describe('When using FleetFilesClient', () => {
  let esClientMock: ElasticsearchClientMock;
  let esFileClientMock: ReturnType<typeof createFileClientMock>;
  let esFile: DeeplyMockedKeys<File>;

  let loggerMock: ReturnType<typeof loggingSystemMock.createLogger>;
  let fleetFilesIndexSearchResponse: estypes.SearchResponse<HostUploadedFileMetadata>;
  let fleetFileDataIndexSearchResponse: estypes.SearchResponse;

  const getFleetFilesInstance = (
    type: FleetFileTransferDirection = 'from-host'
  ): FleetFilesClient => {
    loggerMock = loggingSystemMock.createLogger();

    return new FleetFilesClient(esClientMock, loggerMock, 'foo', type, 12345);
  };

  beforeEach(async () => {
    esClientMock = elasticsearchServiceMock.createElasticsearchClient();
    esFileClientMock = createFileClientMock<FileCustomMeta>({
      hash: {
        sha256: 'e5441eb2bb8a774783d4ff4690153832688bd546c878e953acc3da089ac05d06',
      },
      meta: {
        action_id: '123',
        target_agents: ['abc'],
      },
    });
    createEsFileClientMock.mockReturnValue(esFileClientMock);
    esFile = (await esFileClientMock.get({ id: '1' })) as DeeplyMockedKeys<File>;

    fleetFilesIndexSearchResponse = createFromHostEsSearchResponseMock();
    fleetFileDataIndexSearchResponse = {
      took: 3,
      timed_out: false,
      _shards: {
        total: 2,
        successful: 2,
        skipped: 0,
        failed: 0,
      },
      hits: {
        total: {
          value: 1,
          relation: 'eq',
        },
        max_score: 0,
        hits: [{ _index: '', _id: '' }],
      },
    };

    esClientMock.search.mockImplementation(async (searchRequest = {}) => {
      // File metadata
      if ((searchRequest.index as string).startsWith('.fleet-files-')) {
        return fleetFilesIndexSearchResponse;
      }

      if ((searchRequest.index as string).startsWith('.fleet-file-data-')) {
        return fleetFileDataIndexSearchResponse;
      }

      throw new Error(
        `esClientMock.search(): no mock implemented for route: ${JSON.stringify(searchRequest)}`
      );
    });
  });

  it('should create internal ES File client with expected arguments when type is `from-host', () => {
    getFleetFilesInstance('from-host');

    expect(createEsFileClientMock).toHaveBeenCalledWith({
      elasticsearchClient: esClientMock,
      logger: loggerMock,
      metadataIndex: '.fleet-files-foo',
      blobStorageIndex: '.fleet-file-data-foo',
      maxSizeBytes: 12345,
      indexIsAlias: true,
    });
  });

  it('should create internal ES File client with expected arguments when type is `to-host', () => {
    getFleetFilesInstance('from-host');

    expect(createEsFileClientMock).toHaveBeenCalledWith({
      elasticsearchClient: esClientMock,
      logger: loggerMock,
      // FIXME:PT adjust indexes once new index patterns are added to ES
      metadataIndex: '.fleet-files-foo',
      blobStorageIndex: '.fleet-file-data-foo',
      maxSizeBytes: 12345,
      indexIsAlias: true,
    });
  });

  describe('#get() method', () => {
    it('should retrieve file info for files `from-host`', async () => {
      await expect(getFleetFilesInstance('from-host').get('123')).resolves.toEqual({
        actionId: '83484393-ddba-4f3c-9c7e-f492ee198a85',
        agents: ['eef9254d-f3ed-4518-889f-18714bd6cec1'],
        created: '2023-01-23T16:50:51.278Z',
        id: '123',
        mimeType: 'application/zip',
        name: 'upload.zip',
        sha256: 'e5441eb2bb8a774783d4ff4690153832688bd546c878e953acc3da089ac05d06',
        size: 64395,
        status: 'READY',
      });
    });

    it('should retrieve file info for file `to-host`', async () => {
      await expect(getFleetFilesInstance('to-host').get('123')).resolves.toEqual({
        actionId: '123',
        agents: ['abc'],
        created: '2022-10-10T14:57:30.682Z',
        id: '123',
        mimeType: 'text/plain',
        name: 'test.txt',
        sha256: 'e5441eb2bb8a774783d4ff4690153832688bd546c878e953acc3da089ac05d06',
        size: 1234,
        status: 'READY',
      });
    });

    it('should adjust `status` if no data exists for file', async () => {
      (fleetFileDataIndexSearchResponse.hits.total as estypes.SearchTotalHits).value = 0;
      fleetFileDataIndexSearchResponse.hits.hits = [];

      await expect(getFleetFilesInstance('from-host').get('123')).resolves.toHaveProperty(
        'status',
        'DELETED'
      );
    });
  });

  describe('#create() method', () => {
    let fileReadable: HapiReadableStream;

    beforeEach(() => {
      fileReadable = createHapiReadableStreamMock();
    });

    it('should create a new file with expected metadata', async () => {
      const createdFile = await getFleetFilesInstance('to-host').create(fileReadable, ['123']);

      expect(esFileClientMock.create).toHaveBeenCalledWith({
        id: expect.any(String),
        metadata: {
          meta: {
            action_id: '',
            target_agents: ['123'],
          },
          mime: 'application/text',
          name: 'foo.txt',
        },
      });

      expect(createdFile).toEqual({
        actionId: '123',
        agents: ['abc'],
        created: '2022-10-10T14:57:30.682Z',
        id: '123',
        mimeType: 'text/plain',
        name: 'test.txt',
        sha256: 'e5441eb2bb8a774783d4ff4690153832688bd546c878e953acc3da089ac05d06',
        size: 1234,
        status: 'READY',
      });
    });

    it('should error is `type` is not `to-host`', async () => {
      await expect(
        getFleetFilesInstance('from-host').create(fileReadable, ['123'])
      ).rejects.toThrow('Method is only supported when `type` is `to-host`');
    });

    it('should error if `agentIds` is empty', async () => {
      await expect(getFleetFilesInstance('to-host').create(fileReadable, [])).rejects.toThrow(
        'FleetFilesClientError: Missing agentIds!'
      );
    });

    it('should upload a file and use transform to create hash', async () => {
      const hashTransform = jest
        .requireActual('@kbn/files-plugin/server')
        .createFileHashTransform();

      createFileHashTransformMock.mockReturnValue(hashTransform);
      await getFleetFilesInstance('to-host').create(fileReadable, ['123']);

      expect(esFile.uploadContent).toHaveBeenCalledWith(fileReadable, undefined, {
        transforms: [hashTransform],
      });
    });

    it('should error if hash was not created', async () => {
      esFile.data.hash = undefined;

      await expect(getFleetFilesInstance('to-host').create(fileReadable, ['123'])).rejects.toThrow(
        'FleetFilesClientError: File hash was not generated!'
      );
    });
  });

  describe('#update() method', () => {
    it('should update file with updates provided', async () => {
      const file = await getFleetFilesInstance('to-host').update('123', {
        agents: ['bbb', 'ccc'],
        actionId: 'aaaaaa',
      });

      expect(esFile.update).toHaveBeenCalledWith({
        meta: {
          action_id: 'aaaaaa',
          target_agents: ['bbb', 'ccc'],
        },
      });

      // NOTE: the data below does not match the update done above in this test. Thats ok, since
      // the client that actually does the update (from the Files plugin) is mocked, and it would
      // not return the actual updated content.
      // Goal of this test is just to ensure that `FleetFilesClient.update()` returns a `FleetFile`.
      expect(file).toEqual({
        actionId: '123',
        agents: ['abc'],
        created: '2022-10-10T14:57:30.682Z',
        id: '123',
        mimeType: 'text/plain',
        name: 'test.txt',
        sha256: 'e5441eb2bb8a774783d4ff4690153832688bd546c878e953acc3da089ac05d06',
        size: 1234,
        status: 'READY',
      });
    });

    it('should error if `type` is not `to-host`', async () => {
      await expect(getFleetFilesInstance('from-host').update('1', {})).rejects.toThrow(
        'Method is only supported when `type` is `to-host`'
      );
    });
  });

  describe('#delete() method', () => {
    it('should error if `type` is not `to-host`', async () => {
      await expect(getFleetFilesInstance('from-host').delete('123')).rejects.toThrow(
        'Method is only supported when `type` is `to-host`'
      );
    });

    it('should delete file', async () => {
      const result = await getFleetFilesInstance('to-host').delete('123');

      expect(result).toBeUndefined();
      expect(esFileClientMock.delete).toHaveBeenCalledWith({ id: '123', hasContent: true });
    });
  });

  describe('#doesFileHaveData() method', () => {
    it('should search data index for file id', async () => {
      await getFleetFilesInstance().doesFileHaveData('123');

      expect(esClientMock.search).toHaveBeenCalledWith({
        body: {
          _source: false,
          query: {
            bool: {
              filter: [
                {
                  term: {
                    bid: '123',
                  },
                },
              ],
            },
          },
        },
        index: '.fleet-file-data-foo',
        size: 0,
      });
    });

    it('should return `true` if data exists', async () => {
      await expect(getFleetFilesInstance().doesFileHaveData('123')).resolves.toBe(true);
    });

    it('should return `false` if no data exists', async () => {
      (fleetFileDataIndexSearchResponse.hits.total as estypes.SearchTotalHits).value = 0;
      fleetFileDataIndexSearchResponse.hits.hits = [];

      await expect(getFleetFilesInstance().doesFileHaveData('123')).resolves.toBe(false);
    });
  });

  describe('#download() method', () => {
    it('should should return expected response', async () => {
      await expect(getFleetFilesInstance().download('123')).resolves.toEqual({
        stream: expect.any(Readable),
        fileName: 'test.txt',
        mimeType: 'text/plain',
      });
    });

    it('should throw an error if unable to get file record', async () => {
      esFile.downloadContent.mockRejectedValue(new Error('oh oh'));

      await expect(getFleetFilesInstance().download('123')).rejects.toThrow(
        'Attempt to get download stream failed with: oh oh'
      );
    });
  });
});
