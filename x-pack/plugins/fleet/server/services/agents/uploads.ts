/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { Readable } from 'stream';

import moment from 'moment';
import type { ElasticsearchClient } from '@kbn/core-elasticsearch-server';

import { createEsFileClient } from '@kbn/files-plugin/server';

import type { ResponseHeaders } from '@kbn/core-http-server';

import type { AgentDiagnostics } from '../../../common/types/models';
import { appContextService } from '../app_context';
import {
  AGENT_ACTIONS_INDEX,
  AGENT_ACTIONS_RESULTS_INDEX,
  agentRouteService,
} from '../../../common';

import {
  FILE_STORAGE_DATA_AGENT_INDEX,
  FILE_STORAGE_METADATA_AGENT_INDEX,
  SO_SEARCH_LIMIT,
} from '../../constants';

export async function getAgentUploads(
  esClient: ElasticsearchClient,
  agentId: string
): Promise<AgentDiagnostics[]> {
  const getFile = async (fileId: string) => {
    if (!fileId) return;
    try {
      const file = await esClient.get({
        index: FILE_STORAGE_METADATA_AGENT_INDEX,
        id: fileId,
      });
      return {
        id: file._id,
        ...(file._source as any)?.file,
      };
    } catch (err) {
      if (err.statusCode === 404) {
        appContextService.getLogger().debug(err);
        return;
      } else {
        throw err;
      }
    }
  };

  const actions = await _getRequestDiagnosticsActions(esClient, agentId);

  const results = [];
  for (const action of actions) {
    const file = await getFile(action.fileId);
    const fileName = file?.name ?? `${moment(action.timestamp!).format('YYYY-MM-DD HH:mm:ss')}.zip`;
    const filePath = file ? agentRouteService.getAgentFileDownloadLink(file.id, file.name) : '';
    const result = {
      actionId: action.actionId,
      id: file?.id ?? action.actionId,
      status: file?.Status ?? 'IN_PROGRESS',
      name: fileName,
      createTime: action.timestamp!,
      filePath,
    };
    results.push(result);
  }

  return results;
}

async function _getRequestDiagnosticsActions(
  esClient: ElasticsearchClient,
  agentId: string
): Promise<Array<{ actionId: string; timestamp?: string; fileId: string }>> {
  const agentActionRes = await esClient.search<any>({
    index: AGENT_ACTIONS_INDEX,
    ignore_unavailable: true,
    size: SO_SEARCH_LIMIT,
    query: {
      bool: {
        must: [
          {
            term: {
              type: 'REQUEST_DIAGNOSTICS',
            },
          },
          {
            term: {
              agents: agentId,
            },
          },
        ],
      },
    },
  });

  const agentActionIds = agentActionRes.hits.hits.map((hit) => hit._source?.action_id as string);

  if (agentActionIds.length === 0) {
    return [];
  }

  try {
    const actionResults = await esClient.search<any>({
      index: AGENT_ACTIONS_RESULTS_INDEX,
      ignore_unavailable: true,
      size: SO_SEARCH_LIMIT,
      query: {
        bool: {
          must: [
            {
              terms: {
                action_id: agentActionIds,
              },
            },
            {
              term: {
                agent_id: agentId,
              },
            },
          ],
        },
      },
    });
    return actionResults.hits.hits.map((hit) => ({
      actionId: hit._source?.action_id as string,
      timestamp: hit._source?.['@timestamp'],
      fileId: hit._source?.data?.file_id as string,
    }));
  } catch (err) {
    if (err.statusCode === 404) {
      // .fleet-actions-results does not yet exist
      appContextService.getLogger().debug(err);
      return [];
    } else {
      throw err;
    }
  }
}

export async function getAgentUploadFile(
  esClient: ElasticsearchClient,
  id: string,
  fileName: string
): Promise<{ body: Readable; headers: ResponseHeaders }> {
  try {
    const fileClient = createEsFileClient({
      blobStorageIndex: FILE_STORAGE_DATA_AGENT_INDEX,
      metadataIndex: FILE_STORAGE_METADATA_AGENT_INDEX,
      elasticsearchClient: esClient,
      logger: appContextService.getLogger(),
    });

    const file = await fileClient.get({
      id,
    });

    return {
      body: await file.downloadContent(),
      headers: getDownloadHeadersForFile(fileName),
    };
  } catch (error) {
    appContextService.getLogger().error(error);
    throw error;
  }
}

export function getDownloadHeadersForFile(fileName: string): ResponseHeaders {
  return {
    'content-type': 'application/octet-stream',
    // Note, this name can be overridden by the client if set via a "download" attribute on the HTML tag.
    'content-disposition': `attachment; filename="${fileName}"`,
    'cache-control': 'max-age=31536000, immutable',
    // https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/X-Content-Type-Options
    'x-content-type-options': 'nosniff',
  };
}
