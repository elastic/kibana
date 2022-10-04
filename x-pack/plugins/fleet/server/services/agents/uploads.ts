/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AgentDiagnostics } from '../../../common/types/models';

export async function getAgentUploads(agentId: string): Promise<AgentDiagnostics[]> {
  // const fileClient = createEsFileClient({
  //     blobStorageIndex: '.elastic-agent-blob',
  //     metadataIndex: '.elastic-agent-metadata',
  //     elasticsearchClient: esClient,
  //     logger: appContextService.getLogger(),
  // });

  // const results = await fileClient.find({
  //     status: ['READY'],
  //     meta: { agentId },
  //   });
  return Promise.resolve([
    {
      id: agentId + '-diagnostics-1',
      name: '2022-10-04 10:00:00.zip',
      createTime: '2022-10-04T10:00:00.000Z',
      filePath: '/api/files/files/agent-diagnostics-1/blob/2022-10-04 10:00:00.zip',
      status: 'AWAITING_UPLOAD',
    },
    {
      id: agentId + '-diagnostics-2',
      name: '2022-10-04 11:00:00.zip',
      createTime: '2022-10-04T11:00:00.000Z',
      filePath: '/api/files/files/agent-diagnostics-2/blob/2022-10-04 11:00:00.zip',
      status: 'READY',
    },
  ]);
}
