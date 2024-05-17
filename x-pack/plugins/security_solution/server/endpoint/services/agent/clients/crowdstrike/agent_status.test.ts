/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { GetAgentStatusOptions } from '../lib/types';
import { getCrowdstrikeAgentStatus } from './agent_status';
import { loggingSystemMock } from '@kbn/core-logging-server-mocks';
import { responseActionsClientMock } from '../../../actions/clients/mocks';
import { CrowdstrikeMock } from '../../../actions/clients/crowdstrike/mocks';
import {
  CROWDSTRIKE_NETWORK_STATUS,
  CROWDSTRIKE_STATUS_RESPONSE,
} from './crowdstrike_agent_status_client';

describe('Crowdstrike Get Agent Status service', () => {
  let agentStatusOptions: GetAgentStatusOptions;

  beforeEach(() => {
    agentStatusOptions = {
      agentType: 'crowdstrike',
      agentIds: ['1', '2'],
      logger: loggingSystemMock.create().get('getCrowdstrikeAgentStatus'),
      connectorActionsClient: CrowdstrikeMock.createConnectorActionsClient(),
    };
  });

  it('should throw error if unable to access stack connectors', async () => {
    (agentStatusOptions.connectorActionsClient.getAll as jest.Mock).mockImplementation(async () => {
      throw new Error('boom');
    });
    const getStatusResponsePromise = getCrowdstrikeAgentStatus(agentStatusOptions);

    await expect(getStatusResponsePromise).rejects.toHaveProperty(
      'message',
      'Unable to retrieve list of stack connectors in order to find one for [.crowdstrike]: boom'
    );
  });

  it('should throw error if no Crowdstrike connector is registered', async () => {
    (agentStatusOptions.connectorActionsClient.getAll as jest.Mock).mockResolvedValue([]);
    const getStatusResponsePromise = getCrowdstrikeAgentStatus(agentStatusOptions);

    await expect(getStatusResponsePromise).rejects.toHaveProperty(
      'message',
      'No stack connector instance configured for [.crowdstrike]'
    );
  });

  it('should send api request to Crowdstrike', async () => {
    await getCrowdstrikeAgentStatus(agentStatusOptions);

    expect(agentStatusOptions.connectorActionsClient.execute).toHaveBeenCalledWith({
      actionId: 'crowdstrike-connector-instance-id',
      params: {
        subAction: 'getAgentDetails',
        subActionParams: {
          ids: ['1', '2'],
        },
      },
    });

    expect(agentStatusOptions.connectorActionsClient.execute).toHaveBeenCalledWith({
      actionId: 'crowdstrike-connector-instance-id',
      params: {
        subAction: 'getAgentOnlineStatus',
        subActionParams: {
          ids: ['1', '2'],
        },
      },
    });
  });

  it('should return expected output', async () => {
    agentStatusOptions.agentIds = ['aaa', 'bbb', 'ccc', 'invalid'];
    (agentStatusOptions.connectorActionsClient.execute as jest.Mock).mockResolvedValueOnce(
      responseActionsClientMock.createConnectorActionExecuteResponse({
        data: CrowdstrikeMock.createGetAgentsResponse([
          CrowdstrikeMock.createCrowdstrikeAgentDetails({
            status: CROWDSTRIKE_NETWORK_STATUS.CONTAINED, // Isolated
            device_id: 'aaa',
          }),
          CrowdstrikeMock.createCrowdstrikeAgentDetails({
            status: CROWDSTRIKE_NETWORK_STATUS.LIFT_CONTAINMENT_PENDING, // Releasing
            device_id: 'bbb',
          }),
          CrowdstrikeMock.createCrowdstrikeAgentDetails({
            status: CROWDSTRIKE_NETWORK_STATUS.CONTAINMENT_PENDING, // isolating
            device_id: 'ccc',
          }),
        ]),
      })
    );
    (agentStatusOptions.connectorActionsClient.execute as jest.Mock).mockResolvedValueOnce(
      responseActionsClientMock.createConnectorActionExecuteResponse({
        data: CrowdstrikeMock.createGetAgentsResponse([
          CrowdstrikeMock.createGetAgentOnlineStatusDetails({
            state: CROWDSTRIKE_STATUS_RESPONSE.ONLINE,
            id: 'aaa',
          }),
          CrowdstrikeMock.createGetAgentOnlineStatusDetails({
            state: CROWDSTRIKE_STATUS_RESPONSE.OFFLINE,
            id: 'bbb',
          }),
          CrowdstrikeMock.createGetAgentOnlineStatusDetails({
            state: CROWDSTRIKE_STATUS_RESPONSE.UNKNOWN, // Not sure what this means - we default to Unenrolled for now
            id: 'ccc',
          }),
        ]),
      })
    );

    await expect(getCrowdstrikeAgentStatus(agentStatusOptions)).resolves.toEqual({
      aaa: {
        agentType: 'crowdstrike',
        found: true,
        agentId: 'aaa',
        isUninstalled: false,
        isPendingUninstall: false,
        isolated: true,
        lastSeen: expect.any(String),
        pendingActions: {
          execute: 0,
          'get-file': 0,
          isolate: 0,
          'kill-process': 0,
          'running-processes': 0,
          'suspend-process': 0,
          unisolate: 0,
          upload: 0,
        },
        status: 'healthy',
      },
      bbb: {
        agentType: 'crowdstrike',
        found: true,
        agentId: 'bbb',
        isUninstalled: false,
        isPendingUninstall: false,
        isolated: false,
        lastSeen: expect.any(String),
        pendingActions: {
          execute: 0,
          'get-file': 0,
          isolate: 0,
          'kill-process': 0,
          'running-processes': 0,
          'suspend-process': 0,
          unisolate: 1,
          upload: 0,
        },
        status: 'offline',
      },
      ccc: {
        agentType: 'crowdstrike',
        found: true,
        agentId: 'ccc',
        isUninstalled: false,
        isPendingUninstall: false,
        isolated: false,
        lastSeen: expect.any(String),
        pendingActions: {
          execute: 0,
          'get-file': 0,
          isolate: 1,
          'kill-process': 0,
          'running-processes': 0,
          'suspend-process': 0,
          unisolate: 0,
          upload: 0,
        },
        status: 'unenrolled',
      },
      invalid: {
        agentType: 'crowdstrike',
        found: false,
        agentId: 'invalid',
        isUninstalled: false,
        isPendingUninstall: false,
        isolated: false,
        lastSeen: '',
        pendingActions: {
          execute: 0,
          'get-file': 0,
          isolate: 0,
          'kill-process': 0,
          'running-processes': 0,
          'suspend-process': 0,
          unisolate: 0,
          upload: 0,
        },
        status: 'unenrolled',
      },
    });
  });
});
