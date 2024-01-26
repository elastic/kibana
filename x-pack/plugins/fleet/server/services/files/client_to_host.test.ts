/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

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

import {
  FILE_STORAGE_TO_HOST_DATA_INDEX_PATTERN,
  FILE_STORAGE_TO_HOST_METADATA_INDEX_PATTERN,
} from '../../../common/constants';

import { getFileDataIndexName, getFileMetadataIndexName } from '../../../common';

import type { HapiReadableStream } from '../..';

import { FleetToHostFilesClient } from './client_to_host';

import type { FileCustomMeta } from './types';

import { createFromHostEsSearchResponseMock, createHapiReadableStreamMock } from './mocks';

import type { HostUploadedFileMetadata } from './types';

jest.mock('@kbn/files-plugin/server');

const createEsFileClientMock = _createEsFileClient as jest.Mock;
const createFileHashTransformMock = _createFileHashTransform as jest.Mock;

describe('FleetToHostFilesClient', () => {
  let esClientMock: ElasticsearchClientMock;
  let esFileClientMock: ReturnType<typeof createFileClientMock>;
  let esFile: DeeplyMockedKeys<File>;

  let loggerMock: ReturnType<typeof loggingSystemMock.createLogger>;
  let fleetFilesIndexSearchResponse: estypes.SearchResponse<HostUploadedFileMetadata>;
  let fleetFileDataIndexSearchResponse: estypes.SearchResponse;

  const getFleetFilesInstance = (): FleetToHostFilesClient => {
    loggerMock = loggingSystemMock.createLogger();

    return new FleetToHostFilesClient(
      esClientMock,
      loggerMock,
      getFileMetadataIndexName('foo', true),
      getFileDataIndexName('foo', true),
      12345
    );
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
      if (
        (searchRequest.index as string).startsWith(
          FILE_STORAGE_TO_HOST_METADATA_INDEX_PATTERN.replace('*', '')
        )
      ) {
        return fleetFilesIndexSearchResponse;
      }

      if (
        (searchRequest.index as string).startsWith(
          FILE_STORAGE_TO_HOST_DATA_INDEX_PATTERN.replace('*', '')
        )
      ) {
        return fleetFileDataIndexSearchResponse;
      }

      throw new Error(
        `esClientMock.search(): no mock implemented for route: ${JSON.stringify(searchRequest)}`
      );
    });
  });

  it('should create internal ES File client with expected arguments', () => {
    getFleetFilesInstance();

    expect(createEsFileClientMock).toHaveBeenCalledWith({
      elasticsearchClient: esClientMock,
      logger: loggerMock,
      metadataIndex: '.fleet-fileds-tohost-meta-foo',
      blobStorageIndex: '.fleet-fileds-tohost-data-foo',
      maxSizeBytes: 12345,
      indexIsAlias: true,
    });
  });

  describe('#get() method', () => {
    it('should retrieve file info`', async () => {
      await expect(getFleetFilesInstance().get('123')).resolves.toEqual({
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

      await expect(getFleetFilesInstance().get('123')).resolves.toHaveProperty('status', 'DELETED');
    });
  });

  describe('#create() method', () => {
    let fileReadable: HapiReadableStream;

    beforeEach(() => {
      fileReadable = createHapiReadableStreamMock();
    });

    it('should create a new file with expected metadata', async () => {
      const createdFile = await getFleetFilesInstance().create(fileReadable, ['123']);

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

    it('should error if `agentIds` is empty', async () => {
      await expect(getFleetFilesInstance().create(fileReadable, [])).rejects.toThrow(
        'FleetFilesClientError: Missing agentIds!'
      );
    });

    it('should upload a file and use transform to create hash', async () => {
      const hashTransform = jest
        .requireActual('@kbn/files-plugin/server')
        .createFileHashTransform();

      createFileHashTransformMock.mockReturnValue(hashTransform);
      await getFleetFilesInstance().create(fileReadable, ['123']);

      expect(esFile.uploadContent).toHaveBeenCalledWith(fileReadable, undefined, {
        transforms: [hashTransform],
      });
    });

    it('should error if hash was not created', async () => {
      esFile.data.hash = undefined;

      await expect(getFleetFilesInstance().create(fileReadable, ['123'])).rejects.toThrow(
        'FleetFilesClientError: File hash was not generated!'
      );
    });
  });

  describe('#update() method', () => {
    it('should update file with updates provided', async () => {
      const file = await getFleetFilesInstance().update('123', {
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
  });

  describe('#delete() method', () => {
    it('should delete file', async () => {
      const result = await getFleetFilesInstance().delete('123');

      expect(result).toBeUndefined();
      expect(esFileClientMock.delete).toHaveBeenCalledWith({ id: '123', hasContent: true });
    });
  });
});
