/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type * as estypes from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import type { ElasticsearchClientMock } from '@kbn/core/server/mocks';
import { AGENT_ACTIONS_RESULTS_INDEX } from '@kbn/fleet-plugin/common';
import { Readable } from 'stream';
import type { TransportRequestOptions } from '@elastic/transport';
import { applyEsClientSearchMock } from '../../mocks/utils.mock';
import type { HapiReadableStream } from '../../../types';
import { EndpointActionGenerator } from '../../../../common/endpoint/data_generators/endpoint_action_generator';
import { FleetActionGenerator } from '../../../../common/endpoint/data_generators/fleet_action_generator';
import type {
  EndpointActionResponse,
  LogsEndpointAction,
  LogsEndpointActionResponse,
  FileUploadMetadata,
} from '../../../../common/endpoint/types';
import {
  ENDPOINT_ACTION_RESPONSES_INDEX_PATTERN,
  ENDPOINT_ACTIONS_INDEX,
} from '../../../../common/endpoint/constants';

export const createActionRequestsEsSearchResultsMock = (
  agentIds?: string[],
  isMultipleActions: boolean = false
): estypes.SearchResponse<LogsEndpointAction> => {
  const endpointActionGenerator = new EndpointActionGenerator('seed');

  return isMultipleActions
    ? endpointActionGenerator.toEsSearchResponse<LogsEndpointAction>(
        Array.from({ length: 23 }).map(() => endpointActionGenerator.generateActionEsHit())
      )
    : endpointActionGenerator.toEsSearchResponse<LogsEndpointAction>([
        endpointActionGenerator.generateActionEsHit({
          EndpointActions: { action_id: '123' },
          agent: { id: agentIds ? agentIds : 'agent-a' },
          '@timestamp': '2022-04-27T16:08:47.449Z',
        }),
      ]);
};

export const createActionResponsesEsSearchResultsMock = (
  agentIds?: string[]
): estypes.SearchResponse<LogsEndpointActionResponse | EndpointActionResponse> => {
  const endpointActionGenerator = new EndpointActionGenerator('seed');
  const fleetActionGenerator = new FleetActionGenerator('seed');

  let hitSource: Array<
    estypes.SearchHit<EndpointActionResponse> | estypes.SearchHit<LogsEndpointActionResponse>
  > = [
    fleetActionGenerator.generateResponseEsHit({
      action_id: '123',
      agent_id: 'agent-a',
      error: '',
      '@timestamp': '2022-04-30T16:08:47.449Z',
    }),
    endpointActionGenerator.generateResponseEsHit({
      agent: { id: 'agent-a' },
      EndpointActions: { action_id: '123' },
      '@timestamp': '2022-04-30T16:08:47.449Z',
    }),
  ];

  if (agentIds?.length) {
    const fleetResponses = agentIds.map((id) => {
      return fleetActionGenerator.generateResponseEsHit({
        action_id: '123',
        agent_id: id,
        error: '',
        '@timestamp': '2022-04-30T16:08:47.449Z',
      });
    });

    hitSource = [
      ...fleetResponses,
      endpointActionGenerator.generateResponseEsHit({
        agent: { id: agentIds ? agentIds : 'agent-a' },
        EndpointActions: { action_id: '123' },
        '@timestamp': '2022-04-30T16:08:47.449Z',
      }),
    ];
  }

  return endpointActionGenerator.toEsSearchResponse<
    LogsEndpointActionResponse | EndpointActionResponse
  >(hitSource);
};

/**
 * Applies a mock implementation to the `esClient.search()` method that will return action requests or responses
 * depending on what indexes the `.search()` was called with.
 * @param esClient
 * @param actionRequests
 * @param actionResponses
 */
export const applyActionsEsSearchMock = (
  esClient: ElasticsearchClientMock,
  actionRequests: estypes.SearchResponse<LogsEndpointAction> = createActionRequestsEsSearchResultsMock(),
  actionResponses: estypes.SearchResponse<
    LogsEndpointActionResponse | EndpointActionResponse
  > = createActionResponsesEsSearchResultsMock()
) => {
  applyEsClientSearchMock({
    esClientMock: esClient,
    index: ENDPOINT_ACTIONS_INDEX,
    response: actionRequests,
  });

  applyEsClientSearchMock({
    esClientMock: esClient,
    index: AGENT_ACTIONS_RESULTS_INDEX,
    response: actionResponses,
  });

  applyEsClientSearchMock({
    esClientMock: esClient,
    index: ENDPOINT_ACTION_RESPONSES_INDEX_PATTERN,
    response: actionResponses,
  });
};

/**
 * Applies a mock implementation to the `esClient.search()` method that will return action requests or responses
 * depending on what indexes the `.search()` was called with.
 * @param esClient
 * @param actionRequests
 * @param actionResponses
 */
export const applyActionListEsSearchMock = (
  esClient: ElasticsearchClientMock,
  actionRequests: estypes.SearchResponse<LogsEndpointAction> = createActionRequestsEsSearchResultsMock(),
  actionResponses: estypes.SearchResponse<
    LogsEndpointActionResponse | EndpointActionResponse
  > = createActionResponsesEsSearchResultsMock()
) => {
  const priorSearchMockImplementation = esClient.search.getMockImplementation();

  // @ts-expect-error incorrect type
  esClient.search.mockImplementation(async (...args) => {
    const params = args[0] ?? {};
    const options: TransportRequestOptions = args[1] ?? {};
    const indexes = Array.isArray(params.index) ? params.index : [params.index];

    if (indexes.includes(ENDPOINT_ACTIONS_INDEX)) {
      if (options.meta) {
        return { body: { ...actionRequests } };
      }

      return actionRequests;
    } else if (
      indexes.includes(AGENT_ACTIONS_RESULTS_INDEX) ||
      indexes.includes(ENDPOINT_ACTION_RESPONSES_INDEX_PATTERN)
    ) {
      if (options.meta) {
        return { body: { ...actionResponses } };
      }

      return actionResponses;
    }

    if (priorSearchMockImplementation) {
      return priorSearchMockImplementation(...args);
    }

    return new EndpointActionGenerator().toEsSearchResponse([]);
  });
};

export const generateFileMetadataDocumentMock = (
  overrides: Partial<FileUploadMetadata> = {}
): FileUploadMetadata => {
  return {
    action_id: '83484393-ddba-4f3c-9c7e-f492ee198a85',
    agent_id: 'eef9254d-f3ed-4518-889f-18714bd6cec1',
    src: 'endpoint',
    upload_id: 'da2da88f-4e0a-486d-9261-e89927a297d3',
    upload_start: 1674492651278,
    contents: [
      {
        accessed: '2023-01-23 11:44:43.764000018Z',
        created: '1969-12-31 19:00:00.000000000Z',
        directory: '/home/ubuntu/elastic-agent-8.7.0-SNAPSHOT-linux-arm64/',
        file_extension: '.txt',
        file_name: 'NOTICE.txt',
        gid: 1000,
        inode: 259388,
        mode: '0644',
        mountpoint: '/',
        mtime: '2023-01-22 08:38:58.000000000Z',
        path: '/home/ubuntu/elastic-agent-8.7.0-SNAPSHOT-linux-arm64/NOTICE.txt',
        sha256: '065bf83eb2060d30277faa481b2b165c69484d1be1046192eb03f088e9402056',
        size: 946667,
        target_path: '',
        type: 'file',
        uid: 1000,
      },
    ],
    file: {
      ChunkSize: 4194304,
      Status: 'READY',
      attributes: ['archive', 'compressed'],
      compression: 'deflate',
      extension: 'zip',
      hash: {
        sha256: 'e5441eb2bb8a774783d4ff4690153832688bd546c878e953acc3da089ac05d06',
      },
      mime_type: 'application/zip',
      name: 'upload.zip',
      size: 64395,
      type: 'file',
    },
    host: {
      hostname: 'endpoint10',
    },
    transithash: {
      sha256: 'a0d6d6a2bb73340d4a0ed32b2a46272a19dd111427770c072918aed7a8565010',
    },
    '@timestamp': new Date().toISOString(),

    ...overrides,
  };
};

export const createHapiReadableStreamMock = (): HapiReadableStream => {
  const readable = Readable.from(['test']) as HapiReadableStream;
  readable.hapi = {
    filename: 'foo.txt',
    headers: {
      'content-type': 'application/text',
    },
  };

  return readable;
};
