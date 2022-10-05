/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type * as estypes from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import type { ElasticsearchClientMock } from '@kbn/core/server/mocks';
import { AGENT_ACTIONS_RESULTS_INDEX } from '@kbn/fleet-plugin/common';
import { EndpointActionGenerator } from '../../../../common/endpoint/data_generators/endpoint_action_generator';
import { FleetActionGenerator } from '../../../../common/endpoint/data_generators/fleet_action_generator';
import type {
  EndpointActionResponse,
  LogsEndpointAction,
  LogsEndpointActionResponse,
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
  const priorSearchMockImplementation = esClient.search.getMockImplementation();

  esClient.search.mockImplementation(async (...args) => {
    const params = args[0] ?? {};
    const indexes = Array.isArray(params.index) ? params.index : [params.index];

    if (indexes.includes(ENDPOINT_ACTIONS_INDEX)) {
      return actionRequests;
    } else if (
      indexes.includes(AGENT_ACTIONS_RESULTS_INDEX) ||
      indexes.includes(ENDPOINT_ACTION_RESPONSES_INDEX_PATTERN)
    ) {
      return actionResponses;
    }

    if (priorSearchMockImplementation) {
      return priorSearchMockImplementation(...args);
    }

    return new EndpointActionGenerator().toEsSearchResponse([]);
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
    const indexes = Array.isArray(params.index) ? params.index : [params.index];

    if (indexes.includes(ENDPOINT_ACTIONS_INDEX)) {
      return { body: { ...actionRequests } };
    } else if (
      indexes.includes(AGENT_ACTIONS_RESULTS_INDEX) ||
      indexes.includes(ENDPOINT_ACTION_RESPONSES_INDEX_PATTERN)
    ) {
      return { body: { ...actionResponses } };
    }

    if (priorSearchMockImplementation) {
      return priorSearchMockImplementation(...args);
    }

    return new EndpointActionGenerator().toEsSearchResponse([]);
  });
};
