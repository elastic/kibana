/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient, Logger } from '@kbn/core/server';
import type { Readable } from 'stream';
import type { FileClient } from '@kbn/files-plugin/server';
import { createEsFileClient } from '@kbn/files-plugin/server';
import { errors } from '@elastic/elasticsearch';
import type { SearchTotalHits } from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import type { FileUploadMetadata, UploadedFileInfo } from '../../../../common/endpoint/types';
import { NotFoundError } from '../../errors';
import {
  FILE_STORAGE_DATA_INDEX,
  FILE_STORAGE_METADATA_INDEX,
} from '../../../../common/endpoint/constants';
import { EndpointError } from '../../../../common/endpoint/errors';

const getFileClient = (esClient: ElasticsearchClient, logger: Logger): FileClient => {
  return createEsFileClient({
    metadataIndex: FILE_STORAGE_METADATA_INDEX,
    blobStorageIndex: FILE_STORAGE_DATA_INDEX,
    elasticsearchClient: esClient,
    logger,
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
    const { _id: id, _source: fileDoc } = await esClient.get<FileUploadMetadata>({
      index: FILE_STORAGE_METADATA_INDEX,
      id: fileId,
    });

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
    throw new EndpointError(`Invalid file id [${fileId}] for action [${actionId}]`);
  }
};
