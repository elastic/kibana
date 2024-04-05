/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CrowdstrikeGetAgentsResponse } from '@kbn/stack-connectors-plugin/common/crowdstrike/types';
import {
  CROWDSTRIKE_CONNECTOR_ID,
  SUB_ACTION,
} from '@kbn/stack-connectors-plugin/common/crowdstrike/constants';
import type { ActionsClientMock } from '@kbn/actions-plugin/server/actions_client/actions_client.mock';
import type { ConnectorWithExtraFindData } from '@kbn/actions-plugin/server/application/connector/types';
import { merge } from 'lodash';
import type { ResponseActionsClientOptionsMock } from '../mocks';
import { responseActionsClientMock } from '../mocks';
import type { NormalizedExternalConnectorClient } from '../../..';

export interface CrowdstrikeActionsClientOptionsMock extends ResponseActionsClientOptionsMock {
  connectorActions: NormalizedExternalConnectorClient;
}

const createCrowdstrikeAgentDetailsMock = (
  overrides: Partial<CrowdstrikeGetAgentsResponse['resources'][number][number]> = {}
): CrowdstrikeGetAgentsResponse['resources'][number][number] => {
  return merge(
    {
      device_id: '123456789',
      cid: '234567890',
      agent_load_flags: '0',
      agent_local_time: '2024-03-18T22:21:00.173Z',
      agent_version: '7.07.16206.0',
      bios_manufacturer: 'Amazon EC2',
      bios_version: '1.0',
      config_id_base: '65994753',
      config_id_build: '16206',
      config_id_platform: '8',
      cpu_signature: '8392466',
      cpu_vendor: '1',
      external_ip: '18.157.150.216',
      mac_address: '03-f4-f4-f4-f4',
      instance_id: 'i-456789',
      service_provider: 'AWS_EC2_V2',
      service_provider_account_id: '23456789',
      hostname: 'Crowdstrike-1460',
      first_seen: '2024-03-15T13:18:56Z',
      last_login_timestamp: '2024-03-15T22:11:47Z',
      last_login_user: 'testuser',
      last_login_uid: '1002',
      last_seen: '2024-03-20T07:19:01Z',
      local_ip: '172.31.200.45',
      major_version: '5',
      minor_version: '14',
      os_version: 'RHEL 9.3',
      platform_id: '3',
      platform_name: 'Linux',
      policies: [
        {
          policy_type: 'prevention',
          policy_id: '234234234234',
          applied: true,
          settings_hash: 'f0e04444',
          assigned_date: '2024-03-15T13:20:02.25821602Z',
          applied_date: '2024-03-15T13:20:16.804783955Z',
          rule_groups: [],
        },
      ],
      reduced_functionality_mode: 'no',
      device_policies: {
        prevention: {
          policy_type: 'prevention',
          policy_id: '234234234234',
          applied: true,
          settings_hash: 'f0e04444',
          assigned_date: '2024-03-15T13:20:02.25821602Z',
          applied_date: '2024-03-15T13:20:16.804783955Z',
          rule_groups: [],
        },
        sensor_update: {
          policy_type: 'sensor-update',
          policy_id: '234234234234',
          applied: true,
          settings_hash: 'tagged|5;',
          assigned_date: '2024-03-15T13:20:02.258765734Z',
          applied_date: '2024-03-15T13:23:53.773752711Z',
          uninstall_protection: 'UNKNOWN',
        },
        global_config: {
          policy_type: 'globalconfig',
          policy_id: '234234234234',
          applied: true,
          settings_hash: 'f0e04444',
          assigned_date: '2024-03-18T22:21:01.50638371Z',
          applied_date: '2024-03-18T22:21:30.565040189Z',
        },
        remote_response: {
          policy_type: 'remote-response',
          policy_id: '234234234234',
          applied: true,
          settings_hash: 'f0e04444',
          assigned_date: '2024-03-15T13:20:02.258285018Z',
          applied_date: '2024-03-15T13:20:17.016591803Z',
        },
      },
      groups: [],
      group_hash: '45678909876545678',
      product_type_desc: 'Server',
      provision_status: 'NotProvisioned',
      serial_number: '345678765-35d6-e704-1723-423423432',
      status: 'normal',
      system_manufacturer: 'Amazon EC2',
      system_product_name: 't3a.medium',
      tags: [],
      modified_timestamp: '2024-03-20T07:19:45Z',
      meta: {
        version: '484',
        version_string: '9:33384301139',
      },
      zone_group: 'eu-central-1a',
      kernel_version: '5.14.0-234234el9_3.x86_64',
      chassis_type: '1',
      chassis_type_desc: 'Other',
      connection_ip: '172.31.200.45',
      default_gateway_ip: '172.31.200.1',
      connection_mac_address: '02-e8-f1-0e-b7-c4',
      linux_sensor_mode: 'Kernel Mode',
      deployment_type: 'Standard',
    },
    overrides
  );
};

const createCrowdstrikeGetAgentsApiResponseMock = (
  data: CrowdstrikeGetAgentsResponse['resources'][number] = [createCrowdstrikeAgentDetailsMock()]
): CrowdstrikeGetAgentsResponse => {
  return {
    meta: {
      query_time: 0.001831479,
      powered_by: 'device-api',
      trace_id: '4567898765-432423432432-42342342',
    },
    errors: null,
    resources: [data],
  };
};

const createConnectorActionsClientMock = (): ActionsClientMock => {
  const client = responseActionsClientMock.createConnectorActionsClient();

  (client.getAll as jest.Mock).mockImplementation(async () => {
    const result: ConnectorWithExtraFindData[] = [
      // Crowdstrike connector
      responseActionsClientMock.createConnector({
        actionTypeId: CROWDSTRIKE_CONNECTOR_ID,
        id: 'crowdstrike-connector-instance-id',
      }),
    ];

    return result;
  });

  (client.execute as jest.Mock).mockImplementation(
    async (options: Parameters<typeof client.execute>[0]) => {
      const subAction = options.params.subAction;

      switch (subAction) {
        case SUB_ACTION.GET_AGENT_DETAILS:
          return responseActionsClientMock.createConnectorActionExecuteResponse({
            data: createCrowdstrikeGetAgentsApiResponseMock(),
          });

        default:
          return responseActionsClientMock.createConnectorActionExecuteResponse();
      }
    }
  );

  return client;
};

const createConstructorOptionsMock = (): CrowdstrikeActionsClientOptionsMock => {
  return {
    ...responseActionsClientMock.createConstructorOptions(),
    connectorActions: responseActionsClientMock.createNormalizedExternalConnectorClient(
      createConnectorActionsClientMock()
    ),
  };
};

interface CrowdstrikeEventSearchResponseMock {
  hits: {
    hits: Array<{
      _id: string;
      _index: string;
      fields: Record<string, string[]>;
    }>;
  };
  _shards: { total: number; successful: number; failed: number };
  took: number;
  timed_out: boolean;
}

const createEventSearchResponseMock = (): CrowdstrikeEventSearchResponseMock => ({
  hits: {
    hits: [
      {
        _id: '1-2-3',
        _index: 'logs-crowdstrike.fdr-default',
        fields: {
          'crowdstrike.event.HostName': ['Crowdstrike-1460'],
        },
      },
    ],
  },
  _shards: { total: 1, successful: 1, failed: 0 },
  took: 1,
  timed_out: false,
});

export const CrowdstrikeMock = {
  createGetAgentsResponse: createCrowdstrikeGetAgentsApiResponseMock,
  createCrowdstrikeAgentDetails: createCrowdstrikeAgentDetailsMock,
  createConnectorActionsClient: createConnectorActionsClientMock,
  createConstructorOptions: createConstructorOptionsMock,
  createEventSearchResponse: createEventSearchResponseMock,
};
