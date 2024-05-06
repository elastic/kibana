/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SentinelOneGetAgentsResponse } from '@kbn/stack-connectors-plugin/common/sentinelone/types';
import {
  SENTINELONE_CONNECTOR_ID,
  SUB_ACTION,
} from '@kbn/stack-connectors-plugin/common/sentinelone/constants';
import type { ActionsClientMock } from '@kbn/actions-plugin/server/actions_client/actions_client.mock';
import type { ConnectorWithExtraFindData } from '@kbn/actions-plugin/server/application/connector/types';
import { merge } from 'lodash';
import type { ResponseActionsClientOptionsMock } from '../mocks';
import { responseActionsClientMock } from '../mocks';

export interface SentinelOneActionsClientOptionsMock extends ResponseActionsClientOptionsMock {
  connectorActions: ActionsClientMock;
}

const createSentinelOneAgentDetailsMock = (
  overrides: Partial<SentinelOneGetAgentsResponse['data'][number]> = {}
): SentinelOneGetAgentsResponse['data'][number] => {
  return merge(
    {
      accountId: '11111111111',
      accountName: 'Elastic',
      groupUpdatedAt: null,
      policyUpdatedAt: null,
      activeDirectory: {
        computerDistinguishedName: null,
        computerMemberOf: [],
        lastUserDistinguishedName: null,
        lastUserMemberOf: [],
        userPrincipalName: null,
        mail: null,
      },
      activeThreats: 0,
      agentVersion: '23.3.2.12',
      allowRemoteShell: true,
      appsVulnerabilityStatus: 'not_applicable',
      cloudProviders: {},
      computerName: 'sentinelone-1460',
      consoleMigrationStatus: 'N/A',
      coreCount: 1,
      cpuCount: 1,
      cpuId: 'ARM Cortex-A72',
      createdAt: '2023-12-21T20:32:52.290978Z',
      detectionState: null,
      domain: 'unknown',
      encryptedApplications: false,
      externalId: '',
      externalIp: '108.77.84.191',
      firewallEnabled: true,
      firstFullModeTime: null,
      fullDiskScanLastUpdatedAt: '2023-12-21T20:57:55.690655Z',
      groupId: '9999999999999',
      groupIp: '108.77.84.x',
      groupName: 'Default Group',
      id: '1845174760470303882',
      inRemoteShellSession: false,
      infected: false,
      installerType: '.deb',
      isActive: true,
      isDecommissioned: false,
      isPendingUninstall: false,
      isUninstalled: false,
      isUpToDate: true,
      lastActiveDate: '2023-12-26T21:34:28.032981Z',
      lastIpToMgmt: '192.168.64.2',
      lastLoggedInUserName: '',
      licenseKey: '',
      locationEnabled: false,
      locationType: 'not_supported',
      locations: null,
      machineType: 'server',
      mitigationMode: 'detect',
      mitigationModeSuspicious: 'detect',
      modelName: 'QEMU QEMU Virtual Machine',
      networkInterfaces: [
        {
          gatewayIp: '192.168.64.1',
          gatewayMacAddress: 'be:d0:74:50:d8:64',
          id: '1845174760470303883',
          inet: ['192.168.64.2'],
          inet6: ['fdf4:f033:b1d4:8c51:5054:ff:febc:6253'],
          name: 'enp0s1',
          physical: '52:54:00:BC:62:53',
        },
      ],
      networkQuarantineEnabled: false,
      networkStatus: 'connecting',
      operationalState: 'na',
      operationalStateExpiration: null,
      osArch: '64 bit',
      osName: 'Linux',
      osRevision: 'Ubuntu 22.04.3 LTS 5.15.0-91-generic',
      osStartTime: '2023-12-21T20:31:51Z',
      osType: 'linux',
      osUsername: 'root',
      rangerStatus: 'Enabled',
      rangerVersion: '23.4.0.9',
      registeredAt: '2023-12-21T20:32:52.286752Z',
      remoteProfilingState: 'disabled',
      remoteProfilingStateExpiration: null,
      scanAbortedAt: null,
      scanFinishedAt: '2023-12-21T20:57:55.690655Z',
      scanStartedAt: '2023-12-21T20:33:31.170460Z',
      scanStatus: 'finished',
      serialNumber: null,
      showAlertIcon: false,
      siteId: '88888888888',
      siteName: 'Default site',
      storageName: null,
      storageType: null,
      tags: { sentinelone: [] },
      threatRebootRequired: false,
      totalMemory: 1966,
      updatedAt: '2023-12-26T21:35:35.986596Z',
      userActionsNeeded: [],
      uuid: 'a2f4603d-c9e2-d7a2-bec2-0d646f3bbc9f',
    },
    overrides
  );
};

const createSentinelOneGetAgentsApiResponseMock = (
  data: SentinelOneGetAgentsResponse['data'] = [createSentinelOneAgentDetailsMock()]
): SentinelOneGetAgentsResponse => {
  return {
    pagination: {
      nextCursor: 'next-0',
      totalItems: 1,
    },
    errors: null,
    data,
  };
};

const createConnectorActionsClientMock = (): ActionsClientMock => {
  const client = responseActionsClientMock.createConnectorActionsClient();

  (client.getAll as jest.Mock).mockImplementation(async () => {
    const result: ConnectorWithExtraFindData[] = [
      // SentinelOne connector
      responseActionsClientMock.createConnector({
        actionTypeId: SENTINELONE_CONNECTOR_ID,
        id: 's1-connector-instance-id',
      }),
    ];

    return result;
  });

  (client.execute as jest.Mock).mockImplementation(
    async (options: Parameters<typeof client.execute>[0]) => {
      const subAction = options.params.subAction;

      switch (subAction) {
        case SUB_ACTION.GET_AGENTS:
          return responseActionsClientMock.createConnectorActionExecuteResponse({
            data: createSentinelOneGetAgentsApiResponseMock(),
          });

        default:
          return responseActionsClientMock.createConnectorActionExecuteResponse();
      }
    }
  );

  return client;
};

const createConstructorOptionsMock = (): SentinelOneActionsClientOptionsMock => {
  return {
    ...responseActionsClientMock.createConstructorOptions(),
    connectorActions: createConnectorActionsClientMock(),
  };
};

export const sentinelOneMock = {
  createGetAgentsResponse: createSentinelOneGetAgentsApiResponseMock,
  createSentinelOneAgentDetails: createSentinelOneAgentDetailsMock,
  createConnectorActionsClient: createConnectorActionsClientMock,
  createConstructorOptions: createConstructorOptionsMock,
};
