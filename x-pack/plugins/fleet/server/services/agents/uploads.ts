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
import type { DeleteAgentUploadResponse } from '../../../common/types';
import {
  FILE_STORAGE_DATA_AGENT_INDEX,
  FILE_STORAGE_METADATA_AGENT_INDEX,
  SO_SEARCH_LIMIT,
} from '../../constants';
import { updateFilesStatus } from '../files';
import { FleetError } from '../../errors';

export async function getAgentUploads(
  esClient: ElasticsearchClient,
  agentId: string
): Promise<AgentDiagnostics[]> {
  const getFile = async (actionId: string) => {
    try {
      const fileResponse = await esClient.search({
        index: FILE_STORAGE_METADATA_AGENT_INDEX,
        query: {
          bool: {
            filter: {
              bool: {
                must: [{ term: { agent_id: agentId } }, { term: { action_id: actionId } }],
              },
            },
          },
        },
      });
      if (fileResponse.hits.hits.length === 0) {
        appContextService
          .getLogger()
          .trace(`No matches for action_id ${actionId} and agent_id ${agentId}`);
        return;
      }
      return {
        id: fileResponse.hits.hits[0]._id,
        ...(fileResponse.hits.hits[0]._source as any)?.file,
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

  const results: AgentDiagnostics[] = [];
  for (const action of actions) {
    const file = await getFile(action.actionId);

    // File list is initially built from list of diagnostic actions.
    // If file was deleted intentially by ILM policy or user based on the meta information,
    // or if the meta information does not exist AND the action is old (new actions are
    // ok to show because we want to show in progress files)
    // skip returning this action/file information.
    if (
      file?.Status === 'DELETED' ||
      (!file && Date.parse(action.timestamp!) < Date.now() - 89 * 24 * 3600 * 1000)
    ) {
      continue;
    }

    const fileName =
      file?.name ??
      `elastic-agent-diagnostics-${moment
        .utc(action.timestamp!)
        .format('YYYY-MM-DDTHH-mm-ss')}Z-00.zip`;
    const filePath = file ? agentRouteService.getAgentFileDownloadLink(file.id, file.name) : '';
    const isActionExpired = action.expiration ? Date.parse(action.expiration) < Date.now() : false;
    const status =
      file?.Status ?? (isActionExpired ? 'EXPIRED' : action.error ? 'FAILED' : 'IN_PROGRESS');
    const result = {
      actionId: action.actionId,
      id: file?.id ?? action.actionId,
      status,
      name: fileName,
      createTime: action.timestamp!,
      filePath,
      error: action.error,
    };
    results.push(result);
  }

  return results;
}

async function _getRequestDiagnosticsActions(
  esClient: ElasticsearchClient,
  agentId: string
): Promise<
  Array<{
    actionId: string;
    timestamp?: string;
    expiration?: string;
    fileId?: string;
    error?: string;
  }>
> {
  const agentActionRes = await esClient.search<any>({
    index: AGENT_ACTIONS_INDEX,
    ignore_unavailable: true,
    size: SO_SEARCH_LIMIT,
    sort: { '@timestamp': 'desc' },
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

  const agentActions = agentActionRes.hits.hits.map((hit) => ({
    actionId: hit._source?.action_id as string,
    timestamp: hit._source?.['@timestamp'],
    expiration: hit._source?.expiration,
  }));

  if (agentActions.length === 0) {
    return [];
  }

  try {
    const actionResultsRes = await esClient.search<any>({
      index: AGENT_ACTIONS_RESULTS_INDEX,
      ignore_unavailable: true,
      size: SO_SEARCH_LIMIT,
      query: {
        bool: {
          must: [
            {
              terms: {
                action_id: agentActions.map((action) => action.actionId),
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
    const actionResults = actionResultsRes.hits.hits.map((hit) => ({
      actionId: hit._source?.action_id as string,
      timestamp: hit._source?.['@timestamp'],
      fileId: hit._source?.data?.upload_id as string,
      error: hit._source?.error,
    }));
    return agentActions.map((action) => {
      const actionResult = actionResults.find((result) => result.actionId === action.actionId);
      return {
        actionId: action.actionId,
        timestamp: action.timestamp,
        expiration: action.expiration,
        fileId: actionResult?.fileId,
        error: actionResult?.error,
      };
    });
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
      indexIsAlias: true,
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

export async function deleteAgentUploadFile(
  esClient: ElasticsearchClient,
  id: string
): Promise<DeleteAgentUploadResponse> {
  try {
    // We manually delete the documents from the data streams with `_delete_by_query`
    // because data streams do not support single deletes. See:
    // https://www.elastic.co/guide/en/elasticsearch/reference/current/data-streams.html#data-streams-append-only

    // Delete the file from the file storage data stream
    const filesDeleteResponse = await esClient.deleteByQuery({
      index: FILE_STORAGE_DATA_AGENT_INDEX,
      refresh: true,
      body: {
        query: {
          match: {
            bid: id, // Use `bid` instead of `_id` because `_id` has additional suffixes
          },
        },
      },
    });

    if (
      !!(
        (filesDeleteResponse.deleted && filesDeleteResponse.deleted > 0) ||
        filesDeleteResponse.total === 0
      )
    ) {
      // Update the metadata to mark the file as deleted
      const updateMetadataStatusResponse = (
        await updateFilesStatus(
          esClient,
          undefined,
          { [FILE_STORAGE_METADATA_AGENT_INDEX]: new Set([id]) },
          'DELETED'
        )
      )[0];

      if (updateMetadataStatusResponse.total === 0) {
        throw new FleetError(`Failed to update file ${id} metadata`);
      }

      return {
        id,
        deleted: true,
      };
    } else {
      throw new FleetError(`Failed to delete file ${id} from file storage data stream`);
    }
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
