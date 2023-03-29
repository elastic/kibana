/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient, Logger } from '@kbn/core/server';
import { Readable } from 'stream';
import type { FileClient } from '@kbn/files-plugin/server';
import { createEsFileClient } from '@kbn/files-plugin/server';
import { errors } from '@elastic/elasticsearch';
import type { SearchTotalHits } from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import type { File } from '@kbn/files-plugin/common';
import { v4 as uuidV4 } from 'uuid';
import type stream from 'stream';
import { createHash } from 'crypto';
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
    indexIsAlias: true,
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
    const { name, Status: status, mime_type: mimeType, size, created } = fileDoc.file;
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
      created: new Date(uploadStart || created || Date.now()).toISOString(),
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

  // FIXME:PT remove. POC CODE. NOT PRODUCTION
  return true;

  // if (fileInfo.actionId !== actionId) {
  //   throw new CustomHttpRequestError(`Invalid file id [${fileId}] for action [${actionId}]`, 400);
  // }
};

/**
 * Creates a new file record (file metadata only - no actual file content)
 */
export const createNewFile = async (
  esClient: ElasticsearchClient,
  logger: Logger,
  fileInfo: {
    filename: string;
  },
  fileStream: stream.Readable
): Promise<File> => {
  const fileClient = getFileClient(esClient, logger);

  const file = await fileClient.create({
    id: uuidV4(),
    metadata: {
      name: fileInfo.filename,
    },
  });

  const readStream = new ActionFileStream(fileStream);

  await file.uploadContent(readStream);

  const fileHash = readStream.getFileHash();

  logger.info(`hash: ${fileHash} ${fileInfo.filename}`);

  return file.update({ meta: { sha256: fileHash } });
};

class ActionFileStream extends Readable {
  private readonly hash = createHash('sha256');
  private hashDigest: string = '';

  constructor(private readonly fileStream: Readable) {
    super();
  }

  _read(size: number) {
    const chunk = this.fileStream.read(size);

    if (chunk !== null) {
      this.hash.update(chunk);
    }

    this.push(chunk);
  }

  getFileHash(): string {
    if (!this.hashDigest) {
      this.hashDigest = this.hash.digest('hex');
    }

    return this.hashDigest;
  }
}
