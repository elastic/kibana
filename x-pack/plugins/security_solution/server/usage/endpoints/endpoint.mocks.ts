/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SavedObjectsFindResponse } from 'src/core/server';

import { Agent } from '../../../../fleet/common';
import {
  FLEET_ENDPOINT_PACKAGE_CONSTANT,
  AGENT_EVENT_SAVED_OBJECT_TYPE,
} from './fleet_saved_objects';

const testAgentId = 'testAgentId';
const testAgentPolicyId = 'testAgentPolicyId';
const testHostId = 'randoHostId';
const testHostName = 'testDesktop';

/** Mock OS Platform for endpoint telemetry */
export const MockOSPlatform = 'somePlatform';
/** Mock OS Name for endpoint telemetry */
export const MockOSName = 'somePlatformName';
/** Mock OS Version for endpoint telemetry */
export const MockOSVersion = '1';
/** Mock OS Full Name for endpoint telemetry */
export const MockOSFullName = 'somePlatformFullName';

/**
 *
 * @param lastCheckIn - the last time the agent checked in. Defaults to current ISO time.
 * @description We request the install and OS related telemetry information from the 'fleet-agents' saved objects in ingest_manager. This mocks that response
 */
export const mockFleetObjectsResponse = (
  hasDuplicates = true,
  lastCheckIn = new Date().toISOString()
): { agents: Agent[]; total: number; page: number; perPage: number } | undefined => ({
  page: 1,
  perPage: 20,
  total: 1,
  agents: [
    {
      active: true,
      id: testAgentId,
      policy_id: 'randoAgentPolicyId',
      type: 'PERMANENT',
      user_provided_metadata: {},
      enrolled_at: lastCheckIn,
      local_metadata: {
        elastic: {
          agent: {
            id: testAgentId,
          },
        },
        host: {
          hostname: testHostName,
          name: testHostName,
          id: testHostId,
        },
        os: {
          platform: MockOSPlatform,
          version: MockOSVersion,
          name: MockOSName,
          full: MockOSFullName,
        },
      },
      packages: [FLEET_ENDPOINT_PACKAGE_CONSTANT, 'system'],
      last_checkin: lastCheckIn,
    },
    {
      active: true,
      id: 'oldTestAgentId',
      policy_id: 'randoAgentPolicyId',
      type: 'PERMANENT',
      user_provided_metadata: {},
      enrolled_at: lastCheckIn,
      local_metadata: {
        elastic: {
          agent: {
            id: 'oldTestAgentId',
          },
        },
        host: {
          hostname: hasDuplicates ? testHostName : 'oldRandoHostName',
          name: hasDuplicates ? testHostName : 'oldRandoHostName',
          id: hasDuplicates ? testHostId : 'oldRandoHostId',
        },
        os: {
          platform: MockOSPlatform,
          version: MockOSVersion,
          name: MockOSName,
          full: MockOSFullName,
        },
      },
      packages: [FLEET_ENDPOINT_PACKAGE_CONSTANT, 'system'],
      last_checkin: lastCheckIn,
    },
  ],
});

const mockPolicyPayload = (
  policyStatus: 'success' | 'warning' | 'failure',
  policyMode: 'prevent' | 'detect' | 'off' = 'prevent'
) =>
  JSON.stringify({
    'endpoint-security': {
      Endpoint: {
        configuration: {
          inputs: [
            {
              id: '0d466df0-c60f-11ea-a5c5-151665e785c4',
              policy: {
                linux: {
                  events: {
                    file: true,
                    network: true,
                    process: true,
                  },
                  logging: {
                    file: 'info',
                  },
                },
                mac: {
                  events: {
                    file: true,
                    network: true,
                    process: true,
                  },
                  logging: {
                    file: 'info',
                  },
                  malware: {
                    mode: policyMode,
                  },
                },
                windows: {
                  events: {
                    dll_and_driver_load: true,
                    dns: true,
                    file: true,
                    network: true,
                    process: true,
                    registry: true,
                    security: true,
                  },
                  logging: {
                    file: 'info',
                  },
                  malware: {
                    mode: policyMode,
                  },
                },
              },
            },
          ],
        },
        policy: {
          applied: {
            id: '0d466df0-c60f-11ea-a5c5-151665e785c4',
            response: {
              configurations: {
                malware: {
                  concerned_actions: [
                    'load_config',
                    'workflow',
                    'download_global_artifacts',
                    'download_user_artifacts',
                    'configure_malware',
                    'read_malware_config',
                    'load_malware_model',
                    'read_kernel_config',
                    'configure_kernel',
                    'detect_process_events',
                    'detect_file_write_events',
                    'connect_kernel',
                    'detect_file_open_events',
                    'detect_sync_image_load_events',
                  ],
                  status: `${policyStatus}`,
                },
              },
            },
            status: `${policyStatus}`,
          },
        },
      },
      agent: {
        id: 'testAgentId',
        version: '8.0.0-SNAPSHOT',
      },
      host: {
        architecture: 'x86_64',
        id: 'a4148b63-1758-ab1f-a6d3-f95075cb1a9c',
        os: {
          Ext: {
            variant: 'Windows 10 Pro',
          },
          full: 'Windows 10 Pro 2004 (10.0.19041.329)',
          name: 'Windows',
          version: '2004 (10.0.19041.329)',
        },
      },
    },
  });

/**
 *
 * @param running - allows us to set whether the mocked endpoint is in an active or disabled/failed state
 * @param updatedDate - the last time the endpoint was updated. Defaults to current ISO time.
 * @description We request the events triggered by the agent and get the most recent endpoint event to confirm it is still running. This allows us to mock both scenarios
 */
export const mockFleetEventsObjectsResponse = (
  running?: boolean,
  updatedDate = new Date().toISOString(),
  policyStatus: 'success' | 'failure' = running ? 'success' : 'failure',
  policyMode: 'prevent' | 'detect' | 'off' = 'prevent'
): SavedObjectsFindResponse => {
  return {
    page: 1,
    per_page: 20,
    total: 2,
    saved_objects: [
      {
        type: AGENT_EVENT_SAVED_OBJECT_TYPE,
        id: 'id1',
        attributes: {
          agent_id: testAgentId,
          type: running ? 'STATE' : 'ERROR',
          timestamp: updatedDate,
          subtype: running ? 'RUNNING' : 'FAILED',
          message: `Application: endpoint-security--8.0.0[d8f7f6e8-9375-483c-b456-b479f1d7a4f2]: State changed to ${
            running ? 'RUNNING' : 'FAILED'
          }: `,
          payload: running ? mockPolicyPayload(policyStatus, policyMode) : undefined,
          policy_id: testAgentPolicyId,
        },
        references: [],
        updated_at: updatedDate,
        version: 'WzExOCwxXQ==',
        score: 0,
      },
      {
        type: AGENT_EVENT_SAVED_OBJECT_TYPE,
        id: 'id2',
        attributes: {
          agent_id: testAgentId,
          type: 'STATE',
          timestamp: updatedDate,
          subtype: 'STARTING',
          message:
            'Application: endpoint-security--8.0.0[d8f7f6e8-9375-483c-b456-b479f1d7a4f2]: State changed to STARTING: Starting',
          policy_id: testAgentPolicyId,
        },
        references: [],
        updated_at: updatedDate,
        version: 'WzExNywxXQ==',
        score: 0,
      },
    ],
  };
};
