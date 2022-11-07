/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core/server';
import type { UpdateByQueryResponse, SearchHit } from '@elastic/elasticsearch/lib/api/types';

import {
  FILE_STORAGE_DATA_INDEX,
  FILE_STORAGE_METADATA_INDEX,
} from '../../constants/fleet_es_assets';
import { ES_SEARCH_LIMIT } from '../../../common/constants';
import type { FILE_STATUS } from '../../types/files';

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
  status: FILE_STATUS = 'READY'
): Promise<SearchHit[]> {
  const result = await esClient.search(
    {
      index: FILE_STORAGE_METADATA_INDEX,
      body: {
        size: ES_SEARCH_LIMIT,
        query: {
          term: {
            'file.Status.keyword': status,
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

    const fileIds = acc[file._index];
    acc[file._index] = fileIds ? fileIds.add(file._id) : new Set([file._id]);
    return acc;
  }, {} as FileIdsByIndex);

  const chunks = await esClient.search<{ bid: string }>(
    {
      index: FILE_STORAGE_DATA_INDEX,
      body: {
        size: ES_SEARCH_LIMIT,
        query: {
          bool: {
            must: [
              {
                terms: {
                  'bid.keyword': Array.from(allFileIds),
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
    const integration = hit._index.split('-')[1];
    const metadataIndex = `.fleet-${integration}-files`;
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
  status: FILE_STATUS
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
