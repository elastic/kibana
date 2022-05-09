/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClientMock } from '@kbn/core/server/mocks';
import { elasticsearchServiceMock } from '@kbn/core/server/mocks';
import * as estypes from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import {
  EndpointAction,
  EndpointActionResponse,
  LogsEndpointAction,
  LogsEndpointActionResponse,
} from '../../../../common/endpoint/types';
import { EndpointActionGenerator } from '../../../../common/endpoint/data_generators/endpoint_action_generator';
import { FleetActionGenerator } from '../../../../common/endpoint/data_generators/fleet_action_generator';
import { AGENT_ACTIONS_INDEX, AGENT_ACTIONS_RESULTS_INDEX } from '@kbn/fleet-plugin/common';
import {
  ENDPOINT_ACTION_RESPONSES_INDEX_PATTERN,
  ENDPOINT_ACTIONS_INDEX,
} from '../../../../common/endpoint/constants';
import { getActionDetailsById } from '..';
import { NotFoundError } from '../../errors';

describe('When using `getActionDetailsById()', () => {
  let esClient: ElasticsearchClientMock;
  let endpointActionGenerator: EndpointActionGenerator;
  let fleetActionGenerator: FleetActionGenerator;
  let actionRequests: estypes.SearchResponse<EndpointAction | LogsEndpointAction>;
  let actionResponses: estypes.SearchResponse<EndpointActionResponse | LogsEndpointActionResponse>;

  beforeEach(() => {
    esClient = elasticsearchServiceMock.createScopedClusterClient().asInternalUser;
    endpointActionGenerator = new EndpointActionGenerator('seed');
    fleetActionGenerator = new FleetActionGenerator('seed');

    actionRequests = endpointActionGenerator.toEsSearchResponse<
      EndpointAction | LogsEndpointAction
    >([
      fleetActionGenerator.generateActionEsHit({
        action_id: '123',
        agents: ['agent-a'],
        '@timestamp': '2022-04-27T16:08:47.449Z',
      }),
      endpointActionGenerator.generateActionEsHit({
        EndpointActions: { action_id: '123' },
        agent: { id: 'agent-a' },
        '@timestamp': '2022-04-27T16:08:47.449Z',
      }),
    ]);

    actionResponses = endpointActionGenerator.toEsSearchResponse<
      LogsEndpointActionResponse | EndpointActionResponse
    >([
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
    ]);

    esClient.search.mockImplementation(async (params = {}) => {
      const indexes = Array.isArray(params.index) ? params.index : [params.index];

      if (indexes.includes(AGENT_ACTIONS_INDEX) || indexes.includes(ENDPOINT_ACTIONS_INDEX)) {
        return actionRequests;
      } else if (
        indexes.includes(AGENT_ACTIONS_RESULTS_INDEX) ||
        indexes.includes(ENDPOINT_ACTION_RESPONSES_INDEX_PATTERN)
      ) {
        return actionResponses;
      }

      return endpointActionGenerator.toEsSearchResponse([]);
    });
  });

  it('should return expected output', async () => {
    await expect(getActionDetailsById(esClient, '123')).resolves.toEqual({
      agents: ['agent-a'],
      command: 'isolate',
      completedAt: '2022-04-30T16:08:47.449Z',
      id: '123',
      isCompleted: true,
      isExpired: false,
      logEntries: [
        {
          item: {
            data: {
              '@timestamp': '2022-04-27T16:08:47.449Z',
              action_id: '123',
              agents: ['agent-a'],
              data: {
                command: 'isolate',
                comment: '5wb6pu6kh2xix5i',
              },
              expiration: '2022-04-29T16:08:47.449Z',
              input_type: 'endpoint',
              type: 'INPUT_ACTION',
              user_id: 'elastic',
            },
            id: '44d8b915-c69c-4c48-8c86-b57d0bd631d0',
          },
          type: 'fleetAction',
        },
        {
          item: {
            data: {
              '@timestamp': '2022-04-30T16:08:47.449Z',
              action_data: {
                command: 'unisolate',
                comment: '',
              },
              action_id: '123',
              agent_id: 'agent-a',
              completed_at: '2022-04-30T16:08:47.449Z',
              error: '',
              started_at: expect.any(String),
            },
            id: '8861a097-71c6-47fb-bfb5-a8e32a612685',
          },
          type: 'fleetResponse',
        },
        {
          item: {
            data: {
              '@timestamp': '2022-04-30T16:08:47.449Z',
              EndpointActions: {
                action_id: '123',
                completed_at: '2022-04-30T16:08:47.449Z',
                data: {
                  command: 'unisolate',
                  comment: '',
                },
                started_at: expect.any(String),
              },
              agent: {
                id: 'agent-a',
              },
            },
            id: '61a09771-c647-4b3f-b5a8-e32a612685f7',
          },
          type: 'response',
        },
      ],
      startedAt: '2022-04-27T16:08:47.449Z',
    });
  });

  it('should use expected filters when querying for Action Request', async () => {
    await getActionDetailsById(esClient, '123');

    expect(esClient.search).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        body: {
          query: {
            bool: {
              filter: [
                { term: { action_id: '123' } },
                { term: { input_type: 'endpoint' } },
                { term: { type: 'INPUT_ACTION' } },
              ],
            },
          },
        },
      }),
      expect.any(Object)
    );
  });

  it('should throw an error if action id does not exist', async () => {
    actionRequests = endpointActionGenerator.toEsSearchResponse([]);

    await expect(getActionDetailsById(esClient, '123')).rejects.toBeInstanceOf(NotFoundError);
  });

  it('should have `isExpired` of `true` if NOT complete and expiration is in the past', async () => {
    (actionRequests.hits.hits[0]._source as EndpointAction).expiration = `2021-04-30T16:08:47.449Z`;
    actionResponses.hits.hits.pop(); // remove the endpoint response

    await expect(getActionDetailsById(esClient, '123')).resolves.toEqual(
      expect.objectContaining({
        isExpired: true,
        isCompleted: false,
      })
    );
  });

  it('should have `isExpired` of `false` if complete and expiration is in the past', async () => {
    (actionRequests.hits.hits[0]._source as EndpointAction).expiration = `2021-04-30T16:08:47.449Z`;

    await expect(getActionDetailsById(esClient, '123')).resolves.toEqual(
      expect.objectContaining({
        isExpired: false,
        isCompleted: true,
      })
    );
  });
});
