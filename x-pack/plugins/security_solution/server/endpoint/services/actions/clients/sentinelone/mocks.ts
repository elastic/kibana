/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  SentinelOneGetAgentsResponse,
  SentinelOneGetActivitiesResponse,
  SentinelOneGetRemoteScriptsResponse,
} from '@kbn/stack-connectors-plugin/common/sentinelone/types';
import {
  SENTINELONE_CONNECTOR_ID,
  SUB_ACTION,
} from '@kbn/stack-connectors-plugin/common/sentinelone/constants';
import type { ActionsClientMock } from '@kbn/actions-plugin/server/actions_client/actions_client.mock';
import type { ConnectorWithExtraFindData } from '@kbn/actions-plugin/server/application/connector/types';
import { merge } from 'lodash';
import type { NormalizedExternalConnectorClient } from '../../..';
import type { ResponseActionsClientOptionsMock } from '../mocks';
import { responseActionsClientMock } from '../mocks';

export interface SentinelOneActionsClientOptionsMock extends ResponseActionsClientOptionsMock {
  connectorActions: NormalizedExternalConnectorClient;
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

const createSentinelOneGetRemoteScriptsApiResponseMock =
  (): SentinelOneGetRemoteScriptsResponse => {
    return {
      errors: null,
      data: [
        {
          bucketName: 'us-east-1-prod-remote-scripts',
          createdAt: '2022-07-17T14:02:45.309427Z',
          createdByUser: 'SentinelOne',
          createdByUserId: '-1',
          creator: 'SentinelOne',
          creatorId: '-1',
          fileName:
            '-1/-1/75cYNKCLYJ7kEsjtBSrha0dXTSANJeMmBDQpXlRzPQA%3D/multi-operations-script-bash.sh',
          fileSize: 13701,
          id: '1466645476786791838',
          inputExample: '--terminate --processes ping,chrome --force',
          inputInstructions: '--terminate --processes <processes-name-templates> [-f|--force]',
          inputRequired: true,
          isAvailableForArs: false,
          isAvailableForLite: false,
          mgmtId: -1,
          osTypes: ['macos', 'linux'],
          outputFilePaths: null,
          package: null,
          scopeId: '-1',
          scopeLevel: 'sentinel',
          scopeName: null,
          scopePath: 'Global',
          scriptDescription: null,
          scriptName: 'Terminate Processes (Linux/macOS)',
          scriptRuntimeTimeoutSeconds: 3600,
          scriptType: 'action',
          shortFileName: 'multi-operations-script-bash.sh',
          signature: '75cYNKCLYJ7kEsjtBSrha0dXTSANJeMmBDQpXlRzPQA=',
          signatureType: 'SHA-256',
          supportedDestinations: null,
          updatedAt: '2024-06-30T06:37:53.904005Z',
          updater: null,
          updaterId: null,
          version: '1.0.0',
        },
      ],
      pagination: { nextCursor: null, totalItems: 1 },
    };
  };

const createSentinelOneGetActivitiesApiResponseMock = (): SentinelOneGetActivitiesResponse => {
  return {
    errors: undefined,
    pagination: {
      nextCursor: null,
      totalItems: 1,
    },
    data: [
      {
        accountId: '1392053568574369781',
        accountName: 'Elastic',
        activityType: 81,
        activityUuid: 'ee9227f5-8f59-4f6d-bd46-3b74f93fd939',
        agentId: '1913920934584665209',
        agentUpdatedVersion: null,
        comments: null,
        createdAt: '2024-04-16T19:21:08.492444Z',
        data: {
          accountName: 'Elastic',
          commandBatchUuid: '7011777f-77e7-4a01-a674-e5f767808895',
          computerName: 'ptavares-sentinelone-1371',
          externalIp: '108.77.84.191',
          fullScopeDetails: 'Group Default Group in Site Default site of Account Elastic',
          fullScopeDetailsPath: 'Global / Elastic / Default site / Default Group',
          groupName: 'Default Group',
          groupType: 'Manual',
          ipAddress: '108.77.84.191',
          scopeLevel: 'Group',
          scopeName: 'Default Group',
          siteName: 'Default site',
          username: 'Defend Workflows Automation',
          uuid: 'c06d63d9-9fa2-046d-e91e-dc94cf6695d8',
        },
        description: null,
        groupId: '1392053568591146999',
        groupName: 'Default Group',
        hash: null,
        id: '1929937418124016884',
        osFamily: null,
        primaryDescription:
          'The management user Defend Workflows Automation initiated a fetch file command to the agent ptavares-sentinelone-1371 (108.77.84.191).',
        secondaryDescription: 'IP address: 108.77.84.191',
        siteId: '1392053568582758390',
        siteName: 'Default site',
        threatId: null,
        updatedAt: '2024-04-16T19:21:08.492450Z',
        userId: '1796254913836217560',
      },
    ],
  };
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

        case SUB_ACTION.GET_ACTIVITIES:
          return responseActionsClientMock.createConnectorActionExecuteResponse({
            data: createSentinelOneGetActivitiesApiResponseMock(),
          });

        case SUB_ACTION.GET_REMOTE_SCRIPTS:
          return responseActionsClientMock.createConnectorActionExecuteResponse({
            data: createSentinelOneGetRemoteScriptsApiResponseMock(),
          });

        case SUB_ACTION.EXECUTE_SCRIPT:
          return responseActionsClientMock.createConnectorActionExecuteResponse({
            data: {
              data: {
                affected: 1,
                parentTaskId: 'task-789',
              },
            },
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
    connectorActions: responseActionsClientMock.createNormalizedExternalConnectorClient(
      createConnectorActionsClientMock()
    ),
  };
};

export const sentinelOneMock = {
  createGetAgentsResponse: createSentinelOneGetAgentsApiResponseMock,
  createSentinelOneAgentDetails: createSentinelOneAgentDetailsMock,
  createConnectorActionsClient: createConnectorActionsClientMock,
  createConstructorOptions: createConstructorOptionsMock,
  createSentinelOneActivitiesApiResponse: createSentinelOneGetActivitiesApiResponseMock,
  createSentinelOneGetRemoteScriptsApiResponse: createSentinelOneGetRemoteScriptsApiResponseMock,
};
