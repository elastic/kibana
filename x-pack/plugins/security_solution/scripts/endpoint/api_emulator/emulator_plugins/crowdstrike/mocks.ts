/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type {
  CrowdstrikeBaseApiResponse,
  CrowdstrikeGetAgentOnlineStatusResponse,
  CrowdstrikeGetAgentsResponse,
} from '@kbn/stack-connectors-plugin/common/crowdstrike/types';
import { merge } from 'lodash';

export const createCrowdstrikeGetAgentsApiResponseMock = (
  data: CrowdstrikeBaseApiResponse['resources'][number]
) => {
  return {
    meta: {
      query_time: 0.001831479,
      powered_by: 'device-api',
      trace_id: '4567898765-432423432432-42342342',
    },
    errors: null,
    resources: data,
  };
};

export const createCrowdstrikeAgentDetailsMock = (
  overrides: Partial<CrowdstrikeGetAgentsResponse['resources'][number]> = {}
): CrowdstrikeGetAgentsResponse['resources'][number] => {
  return merge(
    {
      device_id: '5f4ed7ec2690431f8fa79213268779cb',
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
      status: 'containment_pending',
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

export const createCrowdstrikeGetAgentOnlineStatusDetailsMock: (
  overrides: Partial<CrowdstrikeGetAgentOnlineStatusResponse['resources'][number]>
) => CrowdstrikeGetAgentOnlineStatusResponse['resources'][number] = (overrides) => {
  return merge(
    {
      state: 'online',
      id: '5f4ed7ec2690431f8fa79213268779cb',
    },
    overrides
  );
};
