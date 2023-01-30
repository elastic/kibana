/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core/server';
import type { SearchHit, UpdateByQueryResponse } from '@elastic/elasticsearch/lib/api/types';
import type { FileStatus } from '@kbn/files-plugin/common/types';

import {
  FILE_STORAGE_DATA_INDEX_PATTERN,
  FILE_STORAGE_METADATA_INDEX_PATTERN,
} from '../../../common/constants';

import {
  getFileMetadataIndexName,
  getIntegrationNameFromFileDataIndexName,
  getIntegrationNameFromIndexName,
} from '../../../common/services';

import { ES_SEARCH_LIMIT } from '../../../common/constants';

/**
 * Gets files with given status
 *
 * @param esClient
 * @param abortController
 * @param status
 */
export async function getFilesByStatus(
  esClient: ElasticsearchClient,
  abortController: AbortController,
  status: FileStatus = 'READY'
): Promise<SearchHit[]> {
  const result = await esClient.search(
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

  return result.hits.hits;
}

interface FileIdsByIndex {
  [index: string]: Set<string>;
}

/**
 * Returns subset of fileIds that don't have any file chunks
 *
 * @param esClient
 * @param abortController
 * @param files
 */
export async function fileIdsWithoutChunksByIndex(
  esClient: ElasticsearchClient,
  abortController: AbortController,
  files: SearchHit[]
): Promise<{ fileIdsByIndex: FileIdsByIndex; allFileIds: Set<string> }> {
  const allFileIds: Set<string> = new Set();
  const noChunkFileIdsByIndex = files.reduce((acc, file) => {
    allFileIds.add(file._id);

    const integration = getIntegrationNameFromIndexName(
      file._index,
      FILE_STORAGE_METADATA_INDEX_PATTERN
    );
    const metadataIndex = getFileMetadataIndexName(integration);
    const fileIds = acc[metadataIndex];
    acc[metadataIndex] = fileIds ? fileIds.add(file._id) : new Set([file._id]);
    return acc;
  }, {} as FileIdsByIndex);

  const chunks = await esClient.search<{ bid: string }>(
    {
      index: FILE_STORAGE_DATA_INDEX_PATTERN,
      body: {
        size: ES_SEARCH_LIMIT,
        query: {
          bool: {
            must: [
              {
                terms: {
                  bid: Array.from(allFileIds),
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

  chunks.hits.hits.forEach((hit) => {
    const fileId = hit._source?.bid;
    if (!fileId) return;
    const integration = getIntegrationNameFromFileDataIndexName(hit._index);
    const metadataIndex = getFileMetadataIndexName(integration);
    if (noChunkFileIdsByIndex[metadataIndex]?.delete(fileId)) {
      allFileIds.delete(fileId);
    }
  });

  return { fileIdsByIndex: noChunkFileIdsByIndex, allFileIds };
}

/**
 * Updates given files to provided status
 *
 * @param esClient
 * @param abortController
 * @param fileIdsByIndex
 * @param status
 */
export function updateFilesStatus(
  esClient: ElasticsearchClient,
  abortController: AbortController,
  fileIdsByIndex: FileIdsByIndex,
  status: FileStatus
): Promise<UpdateByQueryResponse[]> {
  return Promise.all(
    Object.entries(fileIdsByIndex).map(([index, fileIds]) => {
      return esClient.updateByQuery(
        {
          index,
          refresh: true,
          query: {
            ids: {
              values: Array.from(fileIds),
            },
          },
          script: {
            source: `ctx._source.file.Status = '${status}'`,
            lang: 'painless',
          },
        },
        { signal: abortController.signal }
      );
    })
  );
}
