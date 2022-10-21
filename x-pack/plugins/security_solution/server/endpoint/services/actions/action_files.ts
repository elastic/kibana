/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient, Logger } from '@kbn/core/server';
import type { Readable } from 'stream';
import { createEsFileClient } from '@kbn/files-plugin/server';
import { errors } from '@elastic/elasticsearch';
import { NotFoundError } from '../../errors';
import {
  FILE_STORAGE_DATA_INDEX,
  FILE_STORAGE_METADATA_INDEX,
} from '../../../../common/endpoint/constants';
import { EndpointError } from '../../../../common/endpoint/errors';

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
  const fileClient = createEsFileClient({
    metadataIndex: FILE_STORAGE_METADATA_INDEX,
    blobStorageIndex: FILE_STORAGE_DATA_INDEX,
    elasticsearchClient: esClient,
    logger,
  });

  try {
    const file = await fileClient.get({ id: fileId });
    const { name: fileName, mimeType } = file.data;

    return {
      stream: await file.downloadContent(),
      fileName,
      mimeType,
    };
  } catch (error) {
    if (error instanceof errors.ResponseError) {
      const statusCode = error.statusCode;

      // 404 will be returned if file id is not found -or- index does not exist yet.
      // Using the `NotFoundError` error class will result in the API returning a 404
      if (statusCode === 404) {
        throw new NotFoundError(`File with id [${fileId}] not found`, error);
      }
    }

    throw new EndpointError(`Failed to get file using id [${fileId}]: ${error.message}`, error);
  }
};
