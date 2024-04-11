/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { GetAgentStatusOptions } from './agent_status';
import { getAgentStatus, SENTINEL_ONE_NETWORK_STATUS } from './agent_status';
import { loggingSystemMock } from '@kbn/core-logging-server-mocks';
import { sentinelOneMock } from '../actions/clients/sentinelone/mocks';
import { responseActionsClientMock } from '../actions/clients/mocks';

describe('Endpoint Get Agent Status service', () => {
  let agentStatusOptions: GetAgentStatusOptions;

  beforeEach(() => {
    agentStatusOptions = {
      agentType: 'sentinel_one',
      agentIds: ['1', '2'],
      logger: loggingSystemMock.create().get('getAgentStatus'),
      connectorActionsClient: sentinelOneMock.createConnectorActionsClient(),
    };
  });

  it('should throw error if unable to access stack connectors', async () => {
    (agentStatusOptions.connectorActionsClient.getAll as jest.Mock).mockImplementation(async () => {
      throw new Error('boom');
    });
    const getStatusResponsePromise = getAgentStatus(agentStatusOptions);

    await expect(getStatusResponsePromise).rejects.toHaveProperty(
      'message',
      'Unable to retrieve list of stack connectors: boom'
    );
    await expect(getStatusResponsePromise).rejects.toHaveProperty('statusCode', 400);
  });

  it('should throw error if no SentinelOne connector is registered', async () => {
    (agentStatusOptions.connectorActionsClient.getAll as jest.Mock).mockResolvedValue([]);
    const getStatusResponsePromise = getAgentStatus(agentStatusOptions);

    await expect(getStatusResponsePromise).rejects.toHaveProperty(
      'message',
      'No SentinelOne stack connector found'
    );
    await expect(getStatusResponsePromise).rejects.toHaveProperty('statusCode', 400);
  });

  it('should send api request to SentinelOne', async () => {
    await getAgentStatus(agentStatusOptions);

    expect(agentStatusOptions.connectorActionsClient.execute).toHaveBeenCalledWith({
      actionId: 's1-connector-instance-id',
      params: {
        subAction: 'getAgents',
        subActionParams: {
          uuids: '1,2',
        },
      },
    });
  });

  it('should throw if api call to SentinelOne failed', async () => {
    (agentStatusOptions.connectorActionsClient.execute as jest.Mock).mockResolvedValue(
      responseActionsClientMock.createConnectorActionExecuteResponse({
        status: 'error',
        serviceMessage: 'boom',
      })
    );
    const getStatusResponsePromise = getAgentStatus(agentStatusOptions);

    await expect(getStatusResponsePromise).rejects.toHaveProperty(
      'message',
      'Attempt retrieve agent information from to SentinelOne failed: boom'
    );
    await expect(getStatusResponsePromise).rejects.toHaveProperty('statusCode', 500);
  });

  it('should return expected output', async () => {
    agentStatusOptions.agentIds = ['aaa', 'bbb', 'ccc', 'invalid'];
    (agentStatusOptions.connectorActionsClient.execute as jest.Mock).mockResolvedValue(
      responseActionsClientMock.createConnectorActionExecuteResponse({
        data: sentinelOneMock.createGetAgentsResponse([
          sentinelOneMock.createSentinelOneAgentDetails({
            networkStatus: SENTINEL_ONE_NETWORK_STATUS.DISCONNECTED, // Isolated
            uuid: 'aaa',
          }),
          sentinelOneMock.createSentinelOneAgentDetails({
            networkStatus: SENTINEL_ONE_NETWORK_STATUS.DISCONNECTING, // Releasing
            uuid: 'bbb',
          }),
          sentinelOneMock.createSentinelOneAgentDetails({
            networkStatus: SENTINEL_ONE_NETWORK_STATUS.CONNECTING, // isolating
            uuid: 'ccc',
          }),
        ]),
      })
    );

    await expect(getAgentStatus(agentStatusOptions)).resolves.toEqual({
      aaa: {
        agentType: 'sentinel_one',
        found: true,
        agentId: 'aaa',
        isUninstalled: false,
        isPendingUninstall: false,
        isolated: true,
        lastSeen: '2023-12-26T21:35:35.986596Z',
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
        agentType: 'sentinel_one',
        found: true,
        agentId: 'bbb',
        isUninstalled: false,
        isPendingUninstall: false,
        isolated: false,
        lastSeen: '2023-12-26T21:35:35.986596Z',
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
        status: 'healthy',
      },
      ccc: {
        agentType: 'sentinel_one',
        found: true,
        agentId: 'ccc',
        isUninstalled: false,
        isPendingUninstall: false,
        isolated: false,
        lastSeen: '2023-12-26T21:35:35.986596Z',
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
        status: 'healthy',
      },
      invalid: {
        agentType: 'sentinel_one',
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
