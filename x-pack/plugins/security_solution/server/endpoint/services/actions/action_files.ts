/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient, Logger } from '@kbn/core/server';
import type { Readable } from 'stream';
import type { FileClient } from '@kbn/files-plugin/server';
import { createEsFileClient, createFileHashTransform } from '@kbn/files-plugin/server';
import { errors } from '@elastic/elasticsearch';
import type { SearchTotalHits } from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import { v4 as uuidV4 } from 'uuid';
import type { FileJSON } from '@kbn/shared-ux-file-types';
import assert from 'assert';
import type { File } from '@kbn/files-plugin/common';
import type { HapiReadableStream } from '../../../types';
import { CustomHttpRequestError } from '../../../utils/custom_http_request_error';
import type {
  ActionDetails,
  FileUploadMetadata,
  UploadedFileInfo,
  ResponseActionUploadParameters,
  ResponseActionUploadOutputContent,
} from '../../../../common/endpoint/types';
import { NotFoundError } from '../../errors';
import {
  FILE_STORAGE_DATA_INDEX,
  FILE_STORAGE_METADATA_INDEX,
} from '../../../../common/endpoint/constants';
import { EndpointError } from '../../../../common/endpoint/errors';

const getFileClient = (
  esClient: ElasticsearchClient,
  logger: Logger,
  maxSizeBytes?: number
): FileClient => {
  return createEsFileClient({
    metadataIndex: FILE_STORAGE_METADATA_INDEX,
    blobStorageIndex: FILE_STORAGE_DATA_INDEX,
    elasticsearchClient: esClient,
    logger,
    indexIsAlias: true,
    maxSizeBytes,
  });
};

const getFileRetrievalError = (
  error: Error | errors.ResponseError,
  fileId: string
): EndpointError => {
  if (error instanceof errors.ResponseError) {
    const statusCode = error.statusCode;

    // 404 will be returned if file id is not found -or- index does not exist yet.
    // Using the `NotFoundError` error class will result in the API returning a 404
    if (statusCode === 404) {
      return new NotFoundError(`File with id [${fileId}] not found`, error);
    }
  }

  if (error instanceof EndpointError) {
    return error;
  }

  return new EndpointError(`Failed to get file using id [${fileId}]: ${error.message}`, error);
};

/**
 * Returns a NodeJS `Readable` data stream to a file
 * @param esClient
 * @param logger
 * @param fileId
 */
export const getFileDownloadStream = async (
  esClient: ElasticsearchClient,
  logger: Logger,
  fileId: string
): Promise<{ stream: Readable; fileName: string; mimeType?: string }> => {
  try {
    const fileClient = getFileClient(esClient, logger);
    const file = await fileClient.get({ id: fileId });
    const { name: fileName, mimeType } = file.data;

    return {
      stream: await file.downloadContent(),
      fileName,
      mimeType,
    };
  } catch (error) {
    throw getFileRetrievalError(error, fileId);
  }
};

/**
 * Retrieve information about a file
 *
 * @param esClient
 * @param logger
 * @param fileId
 */
export const getFileInfo = async (
  esClient: ElasticsearchClient,
  logger: Logger,
  fileId: string
): Promise<UploadedFileInfo> => {
  try {
    const fileDocSearchResult = await esClient.search<FileUploadMetadata>({
      index: FILE_STORAGE_METADATA_INDEX,
      body: {
        size: 1,
        query: {
          term: {
            _id: fileId,
          },
        },
      },
    });

    const { _id: id, _source: fileDoc } = fileDocSearchResult.hits.hits[0] ?? {};

    if (!fileDoc) {
      throw new NotFoundError(`File with id [${fileId}] not found`);
    }

    const { upload_start: uploadStart, action_id: actionId, agent_id: agentId } = fileDoc;
    const { name, Status: status, mime_type: mimeType, size } = fileDoc.file;
    let fileHasChunks: boolean = true;

    if (status === 'READY') {
      fileHasChunks = await doesFileHaveChunks(esClient, fileId);

      if (!fileHasChunks) {
        logger.warn(
          `File with id [${fileId}] has no data chunks in index [${FILE_STORAGE_DATA_INDEX}]. File status will be adjusted to DELETED`
        );
      }
    }

    return {
      name,
      id,
      mimeType,
      size,
      actionId,
      agentId,
      created: new Date(uploadStart).toISOString(),
      status: fileHasChunks ? status : 'DELETED',
    };
  } catch (error) {
    throw getFileRetrievalError(error, fileId);
  }
};

const doesFileHaveChunks = async (
  esClient: ElasticsearchClient,
  fileId: string
): Promise<boolean> => {
  const chunks = await esClient.search({
    index: FILE_STORAGE_DATA_INDEX,
    size: 0,
    body: {
      query: {
        bool: {
          filter: [
            {
              term: {
                bid: fileId,
              },
            },
          ],
        },
      },
      // Setting `_source` to false - we don't need the actual document to be returned
      _source: false,
    },
  });

  return Boolean((chunks.hits?.total as SearchTotalHits)?.value);
};

/**
 * Validates that a given `fileId` is valid for the provided action
 * @param esClient
 * @param logger
 * @param fileId
 * @param actionId
 */
export const validateActionFileId = async (
  esClient: ElasticsearchClient,
  logger: Logger,
  fileId: string,
  actionId: string
): Promise<void> => {
  const fileInfo = await getFileInfo(esClient, logger, fileId);

  if (fileInfo.actionId !== actionId) {
    throw new CustomHttpRequestError(`Invalid file id [${fileId}] for action [${actionId}]`, 400);
  }
};

interface UploadFileInternalStorageMeta {
  target_agents: string[];
  action_id: string;
}

interface UploadedFile {
  file: Pick<
    Required<FileJSON<UploadFileInternalStorageMeta>>,
    'id' | 'created' | 'updated' | 'name' | 'mimeType' | 'extension' | 'meta' | 'status'
  > & { size: number; hash: { sha256: string } };
}

export const createFile = async ({
  esClient,
  logger,
  fileStream,
  maxFileBytes,
  agents,
}: {
  esClient: ElasticsearchClient;
  logger: Logger;
  fileStream: HapiReadableStream;
  maxFileBytes: number;
  agents: string[];
}): Promise<UploadedFile> => {
  const fileClient = getFileClient(esClient, logger, maxFileBytes);

  const uploadedFile = await fileClient.create<UploadFileInternalStorageMeta>({
    id: uuidV4(),
    metadata: {
      name: fileStream.hapi.filename ?? 'unknown_file_name',
      mime: fileStream.hapi.headers['content-type'] ?? 'application/octet-stream',
      meta: {
        target_agents: agents,
        action_id: '', // Populated later once we have the action is created
      },
    },
  });

  await uploadedFile.uploadContent(fileStream, undefined, {
    transforms: [createFileHashTransform()],
  });

  assert(uploadedFile.data.hash && uploadedFile.data.hash.sha256, 'File hash was not generated!');

  return toUploadedFileInterface(uploadedFile);
};

const toUploadedFileInterface = (file: File<UploadFileInternalStorageMeta>): UploadedFile => {
  const { name, created, meta, id, mimeType, size, status, extension, hash, updated } =
    file.toJSON();

  return {
    file: {
      name,
      created,
      updated,
      meta,
      id,
      mimeType,
      status,
      extension,
      size: size ?? 0,
      hash: { sha256: hash?.sha256 ?? '' },
    },
  };
};

/**
 * Deletes a file by ID
 * @param esClient
 * @param logger
 * @param fileId
 */
export const deleteFile = async (
  esClient: ElasticsearchClient,
  logger: Logger,
  fileId: string
): Promise<void> => {
  const fileClient = getFileClient(esClient, logger);

  await fileClient.delete({ id: fileId, hasContent: true });
};

/**
 * Sets the `meta.action_id` on the file associated with the `upload` action
 * @param esClient
 * @param logger
 * @param action
 */
export const setFileActionId = async (
  esClient: ElasticsearchClient,
  logger: Logger,
  action: ActionDetails<ResponseActionUploadOutputContent, ResponseActionUploadParameters>
): Promise<UploadedFile> => {
  assert(
    action.parameters?.file_id,
    `Action [${action.id}] has no 'parameters.file_id' defined. Unable to set action id on file metadata record`
  );

  const fileClient = getFileClient(esClient, logger);
  const file = await fileClient.get<UploadFileInternalStorageMeta>({
    id: action.parameters?.file_id,
  });

  await file.update({
    meta: {
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      ...file.data.meta!,
      action_id: action.id,
    },
  });

  return toUploadedFileInterface(file);
};
