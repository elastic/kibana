/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { estypes } from '@elastic/elasticsearch';
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
import type { RawCrowdstrikeInfo } from './types';

jest.mock('../../..', () => ({
  NormalizedExternalConnectorClient: jest.fn(),
  getPendingActionsSummary: jest.fn().mockResolvedValue([]),
}));

const baseResponse = {
  took: 1,
  timed_out: false,
  _shards: { total: 1, successful: 1, skipped: 0, failed: 0 },
};

const getMockSearchResponse = (
  status: CROWDSTRIKE_NETWORK_STATUS,
  agentName: string,
  wrongAgentName?: boolean
) => ({
  ...baseResponse,
  hits: {
    hits: [
      {
        _id: '1',
        _index: 'index',
        fields: { 'crowdstrike.host.id': [agentName] },
        inner_hits: {
          most_recent: {
            hits: {
              hits: [
                {
                  _id: '1',
                  _index: 'index',
                  _source: {
                    crowdstrike: {
                      host: {
                        id: !wrongAgentName ? agentName : 'wrongAgentName',
                        last_seen: '2023-01-01',
                        status,
                      },
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
});
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
    it('should return found false when there is no agent.host.id', async () => {
      const agentIds = ['agent1'];
      const searchResponse: estypes.SearchResponse<RawCrowdstrikeInfo> = getMockSearchResponse(
        CROWDSTRIKE_NETWORK_STATUS.NORMAL,
        'agent1',
        true
      );

      constructorOptions.esClient.search.mockResolvedValueOnce(searchResponse);

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
          found: false,
          isolated: false,
          lastSeen: '2023-01-01',
          status: HostStatus.HEALTHY,
          pendingActions: {},
        },
      });
    });
    it('should accept NORMAL status', async () => {
      const agentIds = ['agent1'];
      const searchResponse: estypes.SearchResponse<RawCrowdstrikeInfo> = getMockSearchResponse(
        CROWDSTRIKE_NETWORK_STATUS.NORMAL,
        'agent1'
      );

      constructorOptions.esClient.search.mockResolvedValueOnce(searchResponse);

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

    it('should accept CONTAINED STATUS ', async () => {
      const agentIds = ['agent2'];
      const searchResponse: estypes.SearchResponse<RawCrowdstrikeInfo> = getMockSearchResponse(
        CROWDSTRIKE_NETWORK_STATUS.CONTAINED,
        'agent2'
      );
      constructorOptions.esClient.search.mockResolvedValueOnce(searchResponse);

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
    it('should set isolated to false if host is pending isolate', async () => {
      const agentIds = ['agent2'];
      const searchResponse: estypes.SearchResponse<RawCrowdstrikeInfo> = getMockSearchResponse(
        CROWDSTRIKE_NETWORK_STATUS.CONTAINMENT_PENDING,
        'agent2'
      );
      constructorOptions.esClient.search.mockResolvedValueOnce(searchResponse);

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
          isolated: false,
          lastSeen: '2023-01-01',
          status: HostStatus.OFFLINE,
          pendingActions: {},
        },
      });
    });
    it('should set isolated to true if host is pending release', async () => {
      const agentIds = ['agent2'];
      const searchResponse: estypes.SearchResponse<RawCrowdstrikeInfo> = getMockSearchResponse(
        CROWDSTRIKE_NETWORK_STATUS.LIFT_CONTAINMENT_PENDING,
        'agent2'
      );
      constructorOptions.esClient.search.mockResolvedValueOnce(searchResponse);

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
          pendingActions: {},
          status: HostStatus.OFFLINE,
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
