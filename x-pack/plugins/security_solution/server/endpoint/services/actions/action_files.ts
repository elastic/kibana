/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient, Logger } from '@kbn/core/server';
import type { Readable } from 'stream';
import type { FileClient } from '@kbn/files-plugin/server';
import type { FileStatus } from '@kbn/files-plugin/common';
import { createEsFileClient } from '@kbn/files-plugin/server';
import { errors } from '@elastic/elasticsearch';
import type { UpdateByQueryResponse } from '@elastic/elasticsearch/lib/api/types';
import type { SearchTotalHits } from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import type { UploadedFileInfo } from '../../../../common/endpoint/types';
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
    const fileClient = getFileClient(esClient, logger);
    const file = await fileClient.get({ id: fileId });
    const { name, id, mimeType, size, status, created } = file.data;
    let fileHasChunks: boolean = true;

    if (status === 'READY') {
      fileHasChunks = await doesFileHaveChunks(esClient, fileId);

      if (!fileHasChunks) {
        logger.debug(
          `File with id [${fileId}] has no data chunks. Status will be adjusted to DELETED`
        );
      }
    }

    // TODO: add `ttl` to the return payload by retrieving the value from ILM?

    return {
      name,
      id,
      mimeType,
      size,
      created,
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
    body: {
      query: {
        term: {
          'bid.keyword': fileId,
        },
      },
      // Setting `_source` to false - we don't need the actual document to be returned
      _source: false,
    },
  });

  return Boolean((chunks.hits?.total as SearchTotalHits)?.value);
};

/**
 * Returns subset of fileIds that don't have any file chunks
 *
 * @param esClient
 * @param fileIds
 * @returns fileIds
 */
export async function fileIdsWithoutChunks(
  esClient: ElasticsearchClient,
  fileIds: string[]
): Promise<string[]> {
  const noChunkFileIds = new Set(fileIds);

  const chunks = await esClient.search<{ bid: string }>({
    index: FILE_STORAGE_DATA_INDEX,
    body: {
      query: {
        terms: {
          'bid.keyword': fileIds,
        },
      },
      _source: ['bid'],
    },
  });

  chunks.hits.hits.forEach((hit) => {
    const fileId = hit._source?.bid;
    if (!fileId) return;
    noChunkFileIds.delete(fileId);
  });

  return Array.from(noChunkFileIds);
}

/**
 * Gets files with given status
 *
 * @param esClient
 * @param status
 */
export function getFilesByStatus(esClient: ElasticsearchClient, status: FileStatus = 'READY') {
  return esClient.search({
    index: FILE_STORAGE_METADATA_INDEX,
    body: {
      query: {
        term: {
          'file.Status.keyword': status,
        },
      },
      _source: false,
    },
    ignore_unavailable: true,
  });
}

/**
 * Updates given fileIds to provided status
 *
 * @param esClient
 * @param fileIds
 */
export function updateFilesStatus(
  esClient: ElasticsearchClient,
  fileIds: string[],
  status: FileStatus
): Promise<UpdateByQueryResponse> {
  return esClient.updateByQuery({
    index: FILE_STORAGE_METADATA_INDEX,
    refresh: true,
    query: {
      ids: {
        values: fileIds,
      },
    },
    script: {
      source: `ctx._source.file.Status = '${status}'`,
      lang: 'painless',
    },
  });
}
