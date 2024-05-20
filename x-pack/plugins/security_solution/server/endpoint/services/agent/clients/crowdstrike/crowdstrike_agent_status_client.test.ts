/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  CrowdstrikeAgentStatusClient,
  CROWDSTRIKE_NETWORK_STATUS,
  CROWDSTRIKE_STATUS_RESPONSE,
} from './crowdstrike_agent_status_client';
import { NormalizedExternalConnectorClient } from '../../..';
import { AgentStatusClientError } from '../errors';
import { HostStatus } from '../../../../../../common/endpoint/types';
import { CrowdstrikeMock } from '../../../actions/clients/crowdstrike/mocks';
import { responseActionsClientMock } from '../../../actions/clients/mocks';
import { savedObjectsClientMock } from '@kbn/core-saved-objects-api-server-mocks';
import type { SearchResponse } from '@elastic/elasticsearch/lib/api/types';

jest.mock('../../..', () => ({
  NormalizedExternalConnectorClient: jest.fn(),
  getPendingActionsSummary: jest.fn().mockResolvedValue([]),
}));

describe('CrowdstrikeAgentStatusClient', () => {
  let client: CrowdstrikeAgentStatusClient;
  const constructorOptions = responseActionsClientMock.createConstructorOptions();

  beforeEach(() => {
    client = new CrowdstrikeAgentStatusClient({
      esClient: constructorOptions.esClient,
      soClient: savedObjectsClientMock.create(),
      connectorActionsClient: CrowdstrikeMock.createConnectorActionsClient(),
      endpointService: constructorOptions.endpointService,
    });
  });

  describe('getAgentStatusFromConnectorAction', () => {
    it('should get agent status from connector action', async () => {
      const agentIds = ['agent1', 'agent2'];
      const mockExecute = jest.fn().mockResolvedValue({
        data: {
          resources: [
            { id: 'agent1', state: CROWDSTRIKE_STATUS_RESPONSE.ONLINE },
            { id: 'agent2', state: CROWDSTRIKE_STATUS_RESPONSE.OFFLINE },
          ],
        },
      });

      (NormalizedExternalConnectorClient as jest.Mock).mockImplementation(() => ({
        setup: jest.fn(),
        execute: mockExecute,
      }));

      // @ts-expect-error private method
      const result = await client.getAgentStatusFromConnectorAction(agentIds);

      expect(mockExecute).toHaveBeenCalledWith({
        params: {
          subAction: 'getAgentOnlineStatus',
          subActionParams: {
            ids: agentIds,
          },
        },
      });

      expect(result).toEqual({
        agent1: { id: 'agent1', state: CROWDSTRIKE_STATUS_RESPONSE.ONLINE },
        agent2: { id: 'agent2', state: CROWDSTRIKE_STATUS_RESPONSE.OFFLINE },
      });
    });
  });

  describe('getAgentStatuses', () => {
    beforeEach(() => {
      // @ts-expect-error private method
      (client.getAgentStatusFromConnectorAction as Jest.Mock) = jest.fn();
    });
    afterEach(() => {
      jest.clearAllMocks();
    });
    it('should get agent statuses', async () => {
      const agentIds = ['agent1'];
      const searchResponse = {
        hits: {
          hits: [
            {
              fields: { 'crowdstrike.host.id': ['agent1'] },
              inner_hits: {
                most_recent: {
                  hits: {
                    hits: [
                      {
                        _source: {
                          crowdstrike: {
                            host: {
                              id: 'agent1',
                              last_seen: '2023-01-01',
                            },
                            status: CROWDSTRIKE_NETWORK_STATUS.NORMAL,
                          },
                        },
                      },
                    ],
                  },
                },
              },
            },
          ],
        },
      };
      constructorOptions.esClient.search.mockResolvedValueOnce(
        searchResponse as unknown as SearchResponse<unknown, unknown>
      );

      const agentStatusResponse = {
        agent1: { id: 'agent1', state: CROWDSTRIKE_STATUS_RESPONSE.ONLINE },
      };
      // @ts-expect-error private method
      (client.getAgentStatusFromConnectorAction as Jest.Mock).mockResolvedValue(
        agentStatusResponse
      );

      const result = await client.getAgentStatuses(agentIds);

      expect(constructorOptions.esClient.search).toHaveBeenCalled();
      expect(result).toEqual({
        agent1: {
          agentId: 'agent1',
          agentType: 'crowdstrike',
          found: true,
          isolated: false,
          lastSeen: '2023-01-01',
          status: HostStatus.HEALTHY,
          pendingActions: {},
        },
      });
    });

    it('should handle unhealthy agent', async () => {
      const agentIds = ['agent2'];
      const searchResponse = {
        hits: {
          hits: [
            {
              fields: { 'crowdstrike.host.id': ['agent2'] },
              inner_hits: {
                most_recent: {
                  hits: {
                    hits: [
                      {
                        _source: {
                          crowdstrike: {
                            host: {
                              id: 'agent2',
                              last_seen: '2023-01-01',
                            },
                            status: CROWDSTRIKE_NETWORK_STATUS.CONTAINED,
                          },
                        },
                      },
                    ],
                  },
                },
              },
            },
          ],
        },
      };
      constructorOptions.esClient.search.mockResolvedValueOnce(
        searchResponse as unknown as SearchResponse<unknown, unknown>
      );

      const agentStatusResponse = {
        agent2: { id: 'agent2', state: CROWDSTRIKE_STATUS_RESPONSE.OFFLINE },
      };

      // @ts-expect-error private method
      (client.getAgentStatusFromConnectorAction as Jest.Mock).mockResolvedValue(
        agentStatusResponse
      );

      const result = await client.getAgentStatuses(agentIds);

      expect(constructorOptions.esClient.search).toHaveBeenCalled();
      expect(result).toEqual({
        agent2: {
          agentId: 'agent2',
          agentType: 'crowdstrike',
          found: true,
          isolated: true,
          lastSeen: '2023-01-01',
          status: HostStatus.OFFLINE,
          pendingActions: {},
        },
      });
    });
    it('should handle error and log it', async () => {
      const agentIds = ['agent1', 'agent2'];
      const error = new Error('ES search failed');
      constructorOptions.esClient.search.mockRejectedValue(error);

      await expect(client.getAgentStatuses(agentIds)).rejects.toThrow(AgentStatusClientError);

      // @ts-expect-error private method
      expect(client.log.error).toHaveBeenCalledWith(expect.any(AgentStatusClientError));
    });
  });
});
