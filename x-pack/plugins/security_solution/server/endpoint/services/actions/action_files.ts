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
import type { unitOfTime } from 'moment';
import moment from 'moment';
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
    const { name, id, mimeType, size, status: actualStatus, created } = file.data;
    let fileHasChunks: boolean = true;

    if (actualStatus === 'READY') {
      fileHasChunks = await doesFileHaveChunks(esClient, fileId);

      if (!fileHasChunks) {
        logger.debug(
          `File with id [${fileId}] has no data chunks. Status will be adjusted to DELETED`
        );
      }
    }

    const status = fileHasChunks ? actualStatus : 'DELETED';
    const ttl = status === 'READY' ? await calculateFileTtl(esClient, created) : -1;

    return {
      name,
      id,
      mimeType,
      size,
      created,
      status,
      ttl,
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

const calculateFileTtl = async (
  esClient: ElasticsearchClient,
  createdDate: string
): Promise<number | undefined> => {
  const policyName = 'foo'; // FIXME:PT get const from fleet
  const ilmPolicy = await esClient.ilm.getLifecycle({ name: policyName }, { ignore: [404] });
  const deleteMinAge = ilmPolicy[policyName]?.policy.phases?.delete?.min_age;

  if (!deleteMinAge) {
    return undefined;
  }

  const duration = parseDuration(String(deleteMinAge));
  const expiresOn = moment(createdDate).add(duration.age, duration.unit);
  const daysLeft = expiresOn.diff(moment(), 'days');

  return daysLeft < 0 ? -1 : daysLeft;
};

interface ParsedDuration {
  age: number;
  unit: unitOfTime.DurationConstructor;
}

/**
 * Parses time duration in the format of `{number}{unit}` (ex. `4d`)
 * @param duration
 */
const parseDuration = (duration: string): ParsedDuration => {
  const response: ParsedDuration = {
    age: 0,
    unit: 'd',
  };

  const matches = /(\d+)(\w)/.exec(duration);

  if (matches) {
    response.age = Number(matches[1]);
    response.unit = matches[2] as unitOfTime.DurationConstructor;
  }

  return response;
};
