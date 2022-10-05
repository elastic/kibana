/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import moment from 'moment';
import type { ElasticsearchClient } from '@kbn/core-elasticsearch-server';

import { createEsFileClient } from '@kbn/files-plugin/server';

import type { AgentDiagnostics } from '../../../common/types/models';
import { appContextService } from '../app_context';
import { AGENT_ACTIONS_INDEX } from '../../../common';

import { SO_SEARCH_LIMIT } from '../../constants';

export async function getAgentUploads(
  esClient: ElasticsearchClient,
  agentId: string
): Promise<AgentDiagnostics[]> {
  // TODO filter agentId
  const filesMetadata = await esClient.search({
    index: '.fleet-agent-files',
    size: 20,
  });
  const files = filesMetadata.hits.hits.map((hit) => ({
    ...(hit._source as any).file,
    id: hit._id,
  }));

  const actions = await _getRequestDiagnosticsActions(esClient, agentId);

  const result = actions.map((action, index) => {
    let file = files.find((item) => item.action_id === action.actionId);
    // TODO mock, remove when files contain actionId
    if (index === actions.length - 1) {
      file = files[0];
    }
    const fileName = file?.name ?? `${moment(action.timestamp!).format('YYYY-MM-DD HH:mm:ss')}.zip`;
    const filePath = `/api/files/files/${action.actionId}/blob/${fileName}`; // TODO mock value
    return {
      actionId: action.actionId,
      id: file?.id ?? action.actionId,
      status: file?.Status ?? 'IN_PROGRESS',
      name: fileName,
      createTime: action.timestamp!,
      filePath,
    };
  });

  // TODO mock failed value
  if (result.length > 0) {
    result.push({
      ...result[0],
      id: 'failed1',
      status: 'FAILED',
    });
  }

  return result;
}

async function _getRequestDiagnosticsActions(
  esClient: ElasticsearchClient,
  agentId: string
): Promise<Array<{ actionId: string; timestamp?: string }>> {
  const res = await esClient.search<any>({
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

  return res.hits.hits.map((hit) => ({
    actionId: hit._source?.action_id as string,
    timestamp: hit._source?.['@timestamp'],
  }));
}

export async function getDiagnosticFile(esClient: ElasticsearchClient, id: string): Promise<any> {
  try {
    const fileClient = createEsFileClient({
      blobStorageIndex: '.fleet-agent-file-data',
      metadataIndex: '.fleet-agent-files',
      elasticsearchClient: esClient,
      logger: appContextService.getLogger(),
    });

    const results = await fileClient.get({
      id,
    });
    return results;
  } catch (error) {
    appContextService.getLogger().error(error);
    throw error;
  }
}
