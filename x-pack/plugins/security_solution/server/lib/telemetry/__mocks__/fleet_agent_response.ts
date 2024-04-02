/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Agent } from '@kbn/fleet-plugin/common';

export const stubFleetAgentResponse: {
  agents: Agent[];
  total: number;
  page: number;
  perPage: number;
} = {
  agents: [
    {
      id: '45112616-62e0-42c5-a8f9-2f8a71a92040',
      type: 'PERMANENT',
      active: true,
      enrolled_at: '2024-01-11T03:39:21.515Z',
      upgraded_at: null,
      upgrade_started_at: null,
      access_api_key_id: 'jY3dWnkBj1tiuAw9pAmq',
      default_api_key_id: 'so3dWnkBj1tiuAw9yAm3',
      policy_id: '147b2096-bd12-4b7e-a100-061dc11ba799',
      last_checkin: '2024-01-11T04:00:35.217Z',
      last_checkin_status: 'online',
      policy_revision: 2,
      packages: [],
      sort: [1704944361515, 'Host-roan3tb8c3'],
      components: [
        {
          id: 'endpoint-0',
          type: 'endpoint',
          status: 'STARTING',
          message: 'Running as external service',
          units: [
            {
              id: 'endpoint-1',
              type: 'input',
              status: 'STARTING',
              message: 'Protecting machine',
              payload: {
                extra: 'payload',
              },
            },
            {
              id: 'shipper',
              type: 'output',
              status: 'STARTING',
              message: 'Connected over GRPC',
              payload: {
                extra: 'payload',
              },
            },
          ],
        },
      ],
      agent: {
        id: '45112616-62e0-42c5-a8f9-2f8a71a92040',
        version: '8.13.0',
      },
      user_provided_metadata: {},
      local_metadata: {
        elastic: {
          agent: {
            'build.original': '8.0.0-SNAPSHOT (build: j74oz at 2021-05-07 18:42:49 +0000 UTC)',
            id: '45112616-62e0-42c5-a8f9-2f8a71a92040',
            log_level: 'info',
            snapshot: true,
            upgradeable: true,
            version: '8.13.0',
          },
        },
        host: {
          architecture: '4nil08yn9j',
          hostname: 'Host-roan3tb8c3',
          id: '866c98c0-c323-4f6b-9e4c-8cc4694e4ba7',
          ip: ['00.00.000.00'],
          mac: ['00-00-00-00-00-00', '00-00-00-00-00-00', '0-00-00-00-00-00'],
          name: 'Host-roan3tb8c3',
          os: {
            name: 'Windows',
            full: 'Windows 10',
            version: '10.0',
            platform: 'Windows',
            family: 'windows',
            Ext: {
              variant: 'Windows Pro',
            },
          },
        },
        os: {
          family: 'windows',
          full: 'Windows 10',
          kernel: '10.0.17763.1879 (Build.160101.0800)',
          name: 'Windows',
          platform: 'Windows',
          version: '10.0',
          Ext: {
            variant: 'Windows Pro',
          },
        },
      },
      status: 'online',
    },
    {
      id: '74550426-040d-4216-a227-599fd3efa91c',
      type: 'PERMANENT',
      active: true,
      enrolled_at: '2024-01-11T03:39:21.512Z',
      upgraded_at: null,
      upgrade_started_at: null,
      access_api_key_id: 'jY3dWnkBj1tiuAw9pAmq',
      default_api_key_id: 'so3dWnkBj1tiuAw9yAm3',
      policy_id: '16608650-4839-4053-a0eb-6ee9d11ac84d',
      last_checkin: '2024-01-11T04:00:35.302Z',
      last_checkin_status: 'online',
      policy_revision: 2,
      packages: [],
      sort: [1704944361512, 'Host-vso4lwuc51'],
      components: [
        {
          id: 'endpoint-0',
          type: 'endpoint',
          status: 'FAILED',
          message: 'Running as external service',
          units: [
            {
              id: 'endpoint-1',
              type: 'input',
              status: 'FAILED',
              message: 'Protecting machine',
              payload: {
                error: {
                  code: -272,
                  message: 'Unable to connect to Elasticsearch',
                },
              },
            },
            {
              id: 'shipper',
              type: 'output',
              status: 'FAILED',
              message: 'Connected over GRPC',
              payload: {
                extra: 'payload',
              },
            },
          ],
        },
      ],
      agent: {
        id: '74550426-040d-4216-a227-599fd3efa91c',
        version: '8.13.0',
      },
      user_provided_metadata: {},
      local_metadata: {
        elastic: {
          agent: {
            'build.original': '8.0.0-SNAPSHOT (build: 315fp at 2021-05-07 18:42:49 +0000 UTC)',
            id: '74550426-040d-4216-a227-599fd3efa91c',
            log_level: 'info',
            snapshot: true,
            upgradeable: true,
            version: '8.13.0',
          },
        },
        host: {
          architecture: '3oem2enr1y',
          hostname: 'Host-vso4lwuc51',
          id: '3cdfece3-8b4e-4006-a19e-7ab7e953bb38',
          ip: ['00.00.000.00'],
          mac: ['00-00-00-00-00-00', '00-00-00-00-00-00', '0-00-00-00-00-00'],
          name: 'Host-vso4lwuc51',
          os: {
            name: 'Windows',
            full: 'Windows Server 2012',
            version: '6.2',
            platform: 'Windows',
            family: 'windows',
            Ext: {
              variant: 'Windows Server',
            },
          },
        },
        os: {
          family: 'windows',
          full: 'Windows Server 2012',
          kernel: '10.0.17763.1879 (Build.160101.0800)',
          name: 'Windows',
          platform: 'Windows',
          version: '6.2',
          Ext: {
            variant: 'Windows Server',
          },
        },
      },
      status: 'online',
    },
    {
      id: 'b80bc33e-1c65-41b3-80d6-8f9757552ab1',
      type: 'PERMANENT',
      active: true,
      enrolled_at: '2024-01-11T03:31:22.832Z',
      upgraded_at: null,
      upgrade_started_at: null,
      access_api_key_id: 'jY3dWnkBj1tiuAw9pAmq',
      default_api_key_id: 'so3dWnkBj1tiuAw9yAm3',
      policy_id: '125f0769-20b4-4604-81ce-f0db812d510b',
      last_checkin: '2024-01-11T04:00:36.305Z',
      last_checkin_status: 'online',
      policy_revision: 2,
      packages: [],
      sort: [1704943882832, 'Host-y0zwnrnucm'],
      components: [
        {
          id: 'endpoint-0',
          type: 'endpoint',
          status: 'STOPPING',
          message: 'Running as external service',
          units: [
            {
              id: 'endpoint-1',
              type: 'input',
              status: 'STOPPING',
              message: 'Protecting machine',
              payload: {
                extra: 'payload',
              },
            },
            {
              id: 'shipper',
              type: 'output',
              status: 'STOPPING',
              message: 'Connected over GRPC',
              payload: {
                extra: 'payload',
              },
            },
          ],
        },
      ],
      agent: {
        id: 'b80bc33e-1c65-41b3-80d6-8f9757552ab1',
        version: '8.13.0',
      },
      user_provided_metadata: {},
      local_metadata: {
        elastic: {
          agent: {
            'build.original': '8.0.0-SNAPSHOT (build: klkq1 at 2021-05-07 18:42:49 +0000 UTC)',
            id: 'b80bc33e-1c65-41b3-80d6-8f9757552ab1',
            log_level: 'info',
            snapshot: true,
            upgradeable: true,
            version: '8.13.0',
          },
        },
        host: {
          architecture: 'ogtqmitmts',
          hostname: 'Host-y0zwnrnucm',
          id: 'aca58288-ac9b-4ce7-9cef-67692fe10363',
          ip: ['00.00.000.00'],
          mac: ['00-00-00-00-00-00', '00-00-00-00-00-00', '0-00-00-00-00-00'],
          name: 'Host-y0zwnrnucm',
          os: {
            name: 'macOS',
            full: 'macOS Monterey',
            version: '12.6.1',
            platform: 'macOS',
            family: 'Darwin',
            Ext: {
              variant: 'Darwin',
            },
          },
        },
        os: {
          family: 'Darwin',
          full: 'macOS Monterey',
          kernel: '10.0.17763.1879 (Build.160101.0800)',
          name: 'macOS',
          platform: 'macOS',
          version: '12.6.1',
          Ext: {
            variant: 'Darwin',
          },
        },
      },
      status: 'online',
    },
    {
      id: 'cbd4cda1-3bac-45a7-9914-812d3b9c5f44',
      type: 'PERMANENT',
      active: true,
      enrolled_at: '2024-01-11T03:21:13.662Z',
      upgraded_at: null,
      upgrade_started_at: null,
      access_api_key_id: 'jY3dWnkBj1tiuAw9pAmq',
      default_api_key_id: 'so3dWnkBj1tiuAw9yAm3',
      policy_id: '004e29f7-3b96-4ce3-8de8-c3024f56eae2',
      last_checkin: '2024-01-11T04:00:37.315Z',
      last_checkin_status: 'online',
      policy_revision: 2,
      packages: [],
      sort: [1704943273662, 'Host-60j0gd14nc'],
      components: [
        {
          id: 'endpoint-0',
          type: 'endpoint',
          status: 'STOPPING',
          message: 'Running as external service',
          units: [
            {
              id: 'endpoint-1',
              type: 'input',
              status: 'STOPPING',
              message: 'Protecting machine',
              payload: {
                extra: 'payload',
              },
            },
            {
              id: 'shipper',
              type: 'output',
              status: 'STOPPING',
              message: 'Connected over GRPC',
              payload: {
                extra: 'payload',
              },
            },
          ],
        },
      ],
      agent: {
        id: 'cbd4cda1-3bac-45a7-9914-812d3b9c5f44',
        version: '8.13.0',
      },
      user_provided_metadata: {},
      local_metadata: {
        elastic: {
          agent: {
            'build.original': '8.0.0-SNAPSHOT (build: slgsg at 2021-05-07 18:42:49 +0000 UTC)',
            id: 'cbd4cda1-3bac-45a7-9914-812d3b9c5f44',
            log_level: 'info',
            snapshot: true,
            upgradeable: true,
            version: '8.13.0',
          },
        },
        host: {
          architecture: '3cgyqy4tx4',
          hostname: 'Host-60j0gd14nc',
          id: 'e76f684a-1f5c-4082-9a21-145d34c2d901',
          ip: ['00.00.000.00'],
          mac: ['00-00-00-00-00-00', '00-00-00-00-00-00', '0-00-00-00-00-00'],
          name: 'Host-60j0gd14nc',
          os: {
            name: 'Windows',
            full: 'Windows Server 2012',
            version: '6.2',
            platform: 'Windows',
            family: 'windows',
            Ext: {
              variant: 'Windows Server',
            },
          },
        },
        os: {
          family: 'windows',
          full: 'Windows Server 2012',
          kernel: '10.0.17763.1879 (Build.160101.0800)',
          name: 'Windows',
          platform: 'Windows',
          version: '6.2',
          Ext: {
            variant: 'Windows Server',
          },
        },
      },
      status: 'online',
    },
    {
      id: '9918e050-035a-4764-bdd3-5cd536a7201c',
      type: 'PERMANENT',
      active: true,
      enrolled_at: '2024-01-11T03:20:54.483Z',
      upgraded_at: null,
      upgrade_started_at: null,
      access_api_key_id: 'jY3dWnkBj1tiuAw9pAmq',
      default_api_key_id: 'so3dWnkBj1tiuAw9yAm3',
      policy_id: '004e29f7-3b96-4ce3-8de8-c3024f56eae2',
      last_checkin: '2024-01-11T04:00:38.328Z',
      last_checkin_status: 'online',
      policy_revision: 2,
      packages: [],
      sort: [1704943254483, 'Host-nh94b0esjr'],
      components: [
        {
          id: 'endpoint-0',
          type: 'endpoint',
          status: 'STARTING',
          message: 'Running as external service',
          units: [
            {
              id: 'endpoint-1',
              type: 'input',
              status: 'STARTING',
              message: 'Protecting machine',
              payload: {
                extra: 'payload',
              },
            },
            {
              id: 'shipper',
              type: 'output',
              status: 'STARTING',
              message: 'Connected over GRPC',
              payload: {
                extra: 'payload',
              },
            },
          ],
        },
      ],
      agent: {
        id: '9918e050-035a-4764-bdd3-5cd536a7201c',
        version: '8.13.0',
      },
      user_provided_metadata: {},
      local_metadata: {
        elastic: {
          agent: {
            'build.original': '8.0.0-SNAPSHOT (build: pd6rl at 2021-05-07 18:42:49 +0000 UTC)',
            id: '9918e050-035a-4764-bdd3-5cd536a7201c',
            log_level: 'info',
            snapshot: true,
            upgradeable: true,
            version: '8.13.0',
          },
        },
        host: {
          architecture: 'q5ni746k3b',
          hostname: 'Host-nh94b0esjr',
          id: 'd036aae1-8a97-4aa6-988c-2e178665272a',
          ip: ['00.00.000.00'],
          mac: ['00-00-00-00-00-00', '00-00-00-00-00-00', '0-00-00-00-00-00'],
          name: 'Host-nh94b0esjr',
          os: {
            Ext: {
              variant: 'Debian',
            },
            kernel: '4.19.0-21-cloud-amd64 #1 SMP Debian 4.19.249-2 (2022-06-30)',
            name: 'Linux',
            family: 'debian',
            type: 'linux',
            version: '10.12',
            platform: 'debian',
            full: 'Debian 10.12',
          },
        },
        os: {
          family: 'debian',
          full: 'Debian 10.12',
          kernel: '4.19.0-21-cloud-amd64 #1 SMP Debian 4.19.249-2 (2022-06-30)',
          name: 'Linux',
          platform: 'debian',
          version: '10.12',
          Ext: {
            variant: 'Debian',
          },
          type: 'linux',
        },
      },
      status: 'online',
    },
  ],
  total: 5,
  page: 1,
  perPage: 10000,
};
