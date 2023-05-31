/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { AgentPolicy, Agent } from '@kbn/fleet-plugin/common';

const agent: Agent = {
  id: 'de9006e1-54a7-4320-b24e-927e6fe518a8',
  active: true,
  policy_id: '63a284b0-0334-11eb-a4e0-09883c57114b',
  type: 'PERMANENT',
  enrolled_at: '2020-09-30T20:24:08.347Z',
  user_provided_metadata: {},
  local_metadata: {
    elastic: {
      agent: {
        id: 'de9006e1-54a7-4320-b24e-927e6fe518a8',
        version: '8.8.0',
        snapshot: false,
        'build.original':
          '8.0.0 (build: e2ef4fc375a5ece83d5d38f57b2977d7866b5819 at 2020-09-30 20:21:35 +0000 UTC)',
      },
    },
    host: {
      architecture: 'x86_64',
      hostname: 'Sandras-MBP.fios-router.home',
      name: 'Sandras-MBP.fios-router.home',
      id: '1112D0AD-526D-5268-8E86-765D35A0F484',
      ip: [
        '127.0.0.1/8',
        '::1/128',
        'fe80::1/64',
        'fe80::aede:48ff:fe00:1122/64',
        'fe80::4fc:2526:7d51:19cc/64',
        '192.168.1.161/24',
        'fe80::3083:5ff:fe30:4b00/64',
        'fe80::3083:5ff:fe30:4b00/64',
        'fe80::f7fb:518e:2c3c:7815/64',
        'fe80::2abd:20e3:9bc3:c054/64',
        'fe80::531a:20ab:1f38:7f9/64',
      ],
      mac: [
        'a6:83:e7:b0:1a:d2',
        'ac:de:48:00:11:22',
        'a4:83:e7:b0:1a:d2',
        '82:c5:c2:25:b0:01',
        '82:c5:c2:25:b0:00',
        '82:c5:c2:25:b0:05',
        '82:c5:c2:25:b0:04',
        '82:c5:c2:25:b0:01',
        '06:83:e7:b0:1a:d2',
        '32:83:05:30:4b:00',
        '32:83:05:30:4b:00',
      ],
    },
    os: {
      family: 'darwin',
      kernel: '19.4.0',
      platform: 'darwin',
      version: '10.15.4',
      name: 'Mac OS X',
      full: 'Mac OS X(10.15.4)',
    },
  },
  access_api_key_id: 'A_6v4HQBEEDXi-A9vxPE',
  default_api_key_id: 'BP6v4HQBEEDXi-A95xMk',
  policy_revision: 1,
  packages: ['system'],
  last_checkin: '2020-10-01T14:43:27.255Z',
  status: 'online',
};

const policies: AgentPolicy = {
  id: 'test-id',
  namespace: 'default',
  monitoring_enabled: ['logs', 'metrics'],
  name: 'Test policy',
  description: 'This is a test policy',
  unenroll_timeout: 60,
  inactivity_timeout: 60,
  is_preconfigured: true,
  status: 'active',
  is_managed: true,
  revision: 1,
  updated_at: '2021-07-07T16:29:55.144Z',
  updated_by: 'system',
  package_policies: [
    {
      package: { name: 'test_package', title: 'Test package', version: '1.0.0' },
      name: 'Test package',
      namespace: 'default',
      enabled: true,
      id: 'test-package-id',
      revision: 1,
      updated_at: '2021-07-07T16:29:55.144Z',
      updated_by: 'system',
      created_at: '2021-07-07T16:29:55.144Z',
      created_by: 'system',
      inputs: [],
      policy_id: 'abc123',
    },
  ],
  is_protected: false,
};

export const fleetAgentHttpResponse = {
  default: () => Promise.resolve({ item: agent }),
  loading: () => new Promise(() => {}),
  noData: () => Promise.resolve({ data: [] }),
};

export const fleetAgentPoliciesHttpResponse = {
  default: () => Promise.resolve({ item: policies }),
  loading: () => new Promise(() => {}),
  noData: () => Promise.resolve({ data: [] }),
};

export type FleetAgentHttpMocks = keyof typeof fleetAgentHttpResponse;
export type FleetAgentPoliciesHttpMocks = keyof typeof fleetAgentPoliciesHttpResponse;
