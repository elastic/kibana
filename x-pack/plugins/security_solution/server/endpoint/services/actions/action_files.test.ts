/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClientMock } from '@kbn/core/server/mocks';
import { elasticsearchServiceMock, loggingSystemMock } from '@kbn/core/server/mocks';
import type { Logger } from '@kbn/core/server';
import {
  createEsFileClient as _createEsFileClient,
  createFileHashTransform as _createFileHashTransform,
} from '@kbn/files-plugin/server';
import { createFileClientMock, createFileMock } from '@kbn/files-plugin/server/mocks';
import {
  createFile,
  deleteFile,
  getFileDownloadStream,
  getFileInfo,
  setFileActionId,
} from './action_files';
import type { DiagnosticResult } from '@elastic/elasticsearch';
import { errors } from '@elastic/elasticsearch';
import { NotFoundError } from '../../errors';
import {
  FILE_STORAGE_DATA_INDEX,
  FILE_STORAGE_METADATA_INDEX,
} from '../../../../common/endpoint/constants';
import { BaseDataGenerator } from '../../../../common/endpoint/data_generators/base_data_generator';
import type * as estypes from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import { createHapiReadableStreamMock, generateFileMetadataDocumentMock } from './mocks';
import type { HapiReadableStream } from '../../../types';
import type {
  ActionDetails,
  ResponseActionUploadOutputContent,
  ResponseActionUploadParameters,
} from '../../../../common/endpoint/types';
import { EndpointActionGenerator } from '../../../../common/endpoint/data_generators/endpoint_action_generator';

jest.mock('@kbn/files-plugin/server');
const createEsFileClient = _createEsFileClient as jest.Mock;
const createFileHashTransformMock = _createFileHashTransform as jest.Mock;

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
    let fileMetaEsResponseMock: estypes.SearchResponse;
    let fileChunksEsResponseMock: estypes.SearchResponse;

    beforeEach(() => {
      fileChunksEsResponseMock = BaseDataGenerator.toEsSearchResponse([
        BaseDataGenerator.toEsSearchHit({}),
      ]);

      fileMetaEsResponseMock = BaseDataGenerator.toEsSearchResponse([
        BaseDataGenerator.toEsSearchHit(
          generateFileMetadataDocumentMock(),
          FILE_STORAGE_METADATA_INDEX
        ),
      ]);

      esClientMock.search.mockImplementation(async (searchRequest = {}) => {
        if (searchRequest.index === FILE_STORAGE_DATA_INDEX) {
          return fileChunksEsResponseMock;
        }

        if (searchRequest.index === FILE_STORAGE_METADATA_INDEX) {
          return fileMetaEsResponseMock;
        }

        return BaseDataGenerator.toEsSearchResponse([]);
      });
    });

    it('should return expected output', async () => {
      await expect(getFileInfo(esClientMock, loggerMock, '123')).resolves.toEqual({
        actionId: '83484393-ddba-4f3c-9c7e-f492ee198a85',
        agentId: 'eef9254d-f3ed-4518-889f-18714bd6cec1',
        created: '2023-01-23T16:50:51.278Z',
        id: '123',
        mimeType: 'application/zip',
        name: 'upload.zip',
        size: 64395,
        status: 'READY',
      });
    });

    it('should check if file has chunks if status is `READY`', async () => {
      fileChunksEsResponseMock = BaseDataGenerator.toEsSearchResponse([]);

      await expect(getFileInfo(esClientMock, loggerMock, '123')).resolves.toEqual({
        actionId: '83484393-ddba-4f3c-9c7e-f492ee198a85',
        agentId: 'eef9254d-f3ed-4518-889f-18714bd6cec1',
        created: '2023-01-23T16:50:51.278Z',
        id: '123',
        mimeType: 'application/zip',
        name: 'upload.zip',
        size: 64395,
        status: 'DELETED',
      });

      expect(loggerMock.warn).toHaveBeenCalledWith(
        'File with id [123] has no data chunks in index [.fleet-file-data-endpoint]. File status will be adjusted to DELETED'
      );
    });

    it('should return a `NotFoundError` if file id is not found', async () => {
      fileMetaEsResponseMock.hits.hits = [];

      await expect(getFileInfo(esClientMock, loggerMock, '123')).rejects.toBeInstanceOf(
        NotFoundError
      );
    });
  });

  describe('#createFile()', () => {
    let fileContent: HapiReadableStream;
    let fileMock: ReturnType<typeof createFileMock>;
    let createFileOptions: Parameters<typeof createFile>[0];
    let fileHashTransform: ReturnType<typeof _createFileHashTransform>;

    beforeEach(() => {
      fileContent = createHapiReadableStreamMock();
      fileMock = createFileMock();
      fileClientMock.create.mockResolvedValue(fileMock);

      fileMock.data.hash = { sha256: 'abc' };

      fileHashTransform = jest.requireActual('@kbn/files-plugin/server').createFileHashTransform();
      createFileHashTransformMock.mockReturnValue(fileHashTransform);

      createFileOptions = {
        esClient: esClientMock,
        logger: loggerMock,
        fileStream: fileContent,
        maxFileBytes: Infinity,
        agents: ['123'],
      };
    });

    it('should create a new file metadata and set expected data', async () => {
      await createFile(createFileOptions);

      expect(fileClientMock.create).toHaveBeenCalledWith({
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
    });

    it('should use File Hash transform when uploading file', async () => {
      await createFile(createFileOptions);

      expect(fileMock.uploadContent).toHaveBeenCalledWith(fileContent, undefined, {
        transforms: [fileHashTransform],
      });
    });

    it('should return expected response', async () => {
      await expect(createFile(createFileOptions)).resolves.toEqual({
        file: {
          created: '2022-10-10T14:57:30.682Z',
          updated: '2022-10-19T14:43:20.112Z',
          extension: '.txt',
          hash: {
            sha256: 'abc',
          },
          id: '123',
          meta: {},
          mimeType: 'text/plain',
          name: 'test.txt',
          size: 1234,
          status: 'READY',
        },
      });
    });
  });

  describe('#deleteFile()', () => {
    it('Delete a file using id', async () => {
      await deleteFile(esClientMock, loggerMock, 'abc');

      expect(fileClientMock.delete).toHaveBeenCalledWith({
        id: 'abc',
        hasContent: true,
      });
    });
  });

  describe('#setFileActionId()', () => {
    let action: ActionDetails<ResponseActionUploadOutputContent, ResponseActionUploadParameters>;
    let fileMock: ReturnType<typeof createFileMock>;

    beforeEach(() => {
      action = new EndpointActionGenerator('seed').generateActionDetails<
        ResponseActionUploadOutputContent,
        ResponseActionUploadParameters
      >({ command: 'upload' });

      fileMock = createFileMock();
      fileClientMock.get.mockResolvedValue(fileMock);
    });

    it('should update file meta with action id', async () => {
      await setFileActionId(esClientMock, loggerMock, action);

      expect(fileMock.update).toHaveBeenCalledWith({
        meta: {
          action_id: '123',
        },
      });
    });

    it('should throw an error no `action.parameters.file.file_id` defined', async () => {
      action.parameters!.file_id = '';

      await expect(setFileActionId(esClientMock, loggerMock, action)).rejects.toThrow(
        "Action [123] has no 'parameters.file_id' defined. Unable to set action id on file metadata record"
      );
    });
  });
});
