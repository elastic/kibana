/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { searchHitToAgent } from './helpers';

describe('searchHitToAgent', () => {
  it('should map known fields from agent document', () => {
    const hit = {
      _source: {
        access_api_key_id: 'EH_RlIgBn_WkCEINY-qh',
        active: true,
        enrolled_at: '2023-06-07T07:45:30Z',
        local_metadata: {
          elastic: {
            agent: {
              'build.original':
                '8.9.0-SNAPSHOT (build: 953fda060f317c2389ef6fd1cac8806a2bfe92ac at 2023-05-29 14:51:32 +0000 UTC)',
            },
          },
        },
        agent: {
          id: '504b3006-52df-46a6-b7db-f3dc67aca7ac',
          version: '8.9.0',
        },
        policy_id: '76c5b020-0486-11ee-97a3-c3856dd800f7',
        type: 'PERMANENT',
        outputs: {
          '68233290-0486-11ee-97a3-c3856dd800f7': {
            api_key: 'En_RlIgBn_WkCEINb-pQ:mfeV4ji6RNGyCOBs25gteg',
            permissions_hash: '6ac9e595a2f8cba8893f9ea1fbfb6cba4b4d6f16d935c17a6368f11ee0b0a5d8',
            type: 'elasticsearch',
            api_key_id: 'En_RlIgBn_WkCEINb-pQ',
            to_retire_api_key_ids: [
              {
                id: '1',
                retired_at: '',
              },
            ],
          },
        },
        policy_revision_idx: 2,
        components: [
          {
            id: 'system/metrics-68233290-0486-11ee-97a3-c3856dd800f7',
            units: [
              {
                id: 'system/metrics-68233290-0486-11ee-97a3-c3856dd800f7-system/metrics-system-03ac5d6e-4931-4ace-a034-5e25768db326',
                type: 'input',
                message: 'Healthy',
                status: 'HEALTHY',
                payload: {
                  key: 'val',
                },
              },
            ],
            type: 'system/metrics',
            message: "Healthy: communicating with pid '36'",
            status: 'HEALTHY',
          },
        ],
        last_checkin_message: 'Running',
        last_checkin_status: 'online',
        last_checkin: '2023-06-07T08:39:03Z',
        unenrolled_at: '2023-06-07T07:45:30Z',
        unenrollment_started_at: '2023-06-07T07:45:30Z',
        upgraded_at: '2023-06-07T07:45:30Z',
        upgrade_started_at: '2023-06-07T07:45:30Z',
        default_api_key_id: 'EH_RlIgBn_WkCEINY-qh',
        packages: ['system'],
        tags: ['agent'],
        user_provided_metadata: {
          key: 'val',
        },
        default_api_key_history: [
          {
            id: '1',
            retired_at: '',
          },
        ],
      },
      sort: [1686123930000, 'beb13bf6a73e'],
      fields: {
        status: ['online'],
      },
      _id: '504b3006-52df-46a6-b7db-f3dc67aca7ac',
    };
    const agent = searchHitToAgent(hit as any);
    expect(agent).toEqual({
      id: '504b3006-52df-46a6-b7db-f3dc67aca7ac',
      type: 'PERMANENT',
      active: true,
      enrolled_at: '2023-06-07T07:45:30Z',
      access_api_key_id: 'EH_RlIgBn_WkCEINY-qh',
      policy_id: '76c5b020-0486-11ee-97a3-c3856dd800f7',
      last_checkin: '2023-06-07T08:39:03Z',
      last_checkin_status: 'online',
      last_checkin_message: 'Running',
      policy_revision: 2,
      sort: [1686123930000, 'beb13bf6a73e'],
      outputs: {
        '68233290-0486-11ee-97a3-c3856dd800f7': {
          api_key_id: 'En_RlIgBn_WkCEINb-pQ',
          type: 'elasticsearch',
          to_retire_api_key_ids: [
            {
              id: '1',
              retired_at: '',
            },
          ],
        },
      },
      components: [
        {
          id: 'system/metrics-68233290-0486-11ee-97a3-c3856dd800f7',
          type: 'system/metrics',
          status: 'HEALTHY',
          message: "Healthy: communicating with pid '36'",
          units: [
            {
              id: 'system/metrics-68233290-0486-11ee-97a3-c3856dd800f7-system/metrics-system-03ac5d6e-4931-4ace-a034-5e25768db326',
              type: 'input',
              status: 'HEALTHY',
              message: 'Healthy',
              payload: {
                key: 'val',
              },
            },
          ],
        },
      ],
      local_metadata: {
        elastic: {
          agent: {
            'build.original':
              '8.9.0-SNAPSHOT (build: 953fda060f317c2389ef6fd1cac8806a2bfe92ac at 2023-05-29 14:51:32 +0000 UTC)',
          },
        },
      },
      status: 'online',
      unenrolled_at: '2023-06-07T07:45:30Z',
      unenrollment_started_at: '2023-06-07T07:45:30Z',
      upgraded_at: '2023-06-07T07:45:30Z',
      upgrade_started_at: '2023-06-07T07:45:30Z',
      default_api_key_id: 'EH_RlIgBn_WkCEINY-qh',
      packages: ['system'],
      tags: ['agent'],
      user_provided_metadata: {
        key: 'val',
      },
      default_api_key_history: [
        {
          id: '1',
          retired_at: '',
        },
      ],
      agent: {
        id: '504b3006-52df-46a6-b7db-f3dc67aca7ac',
        version: '8.9.0',
      },
    });
  });

  it('should work with DEGRADED last_checkin_status', () => {
    const hit = {
      _source: {
        access_api_key_id: 'EH_RlIgBn_WkCEINY-qh',
        active: true,
        enrolled_at: '2023-06-07T07:45:30Z',
        local_metadata: {
          elastic: {
            agent: {
              'build.original':
                '8.9.0-SNAPSHOT (build: 953fda060f317c2389ef6fd1cac8806a2bfe92ac at 2023-05-29 14:51:32 +0000 UTC)',
            },
          },
        },
        agent: {
          id: '504b3006-52df-46a6-b7db-f3dc67aca7ac',
          version: '8.9.0',
        },
        policy_id: '76c5b020-0486-11ee-97a3-c3856dd800f7',
        type: 'PERMANENT',
        outputs: {
          '68233290-0486-11ee-97a3-c3856dd800f7': {
            api_key: 'En_RlIgBn_WkCEINb-pQ:mfeV4ji6RNGyCOBs25gteg',
            permissions_hash: '6ac9e595a2f8cba8893f9ea1fbfb6cba4b4d6f16d935c17a6368f11ee0b0a5d8',
            type: 'elasticsearch',
            api_key_id: 'En_RlIgBn_WkCEINb-pQ',
            to_retire_api_key_ids: [
              {
                id: '1',
                retired_at: '',
              },
            ],
          },
        },
        policy_revision_idx: 2,
        components: [
          {
            id: 'system/metrics-68233290-0486-11ee-97a3-c3856dd800f7',
            units: [
              {
                id: 'system/metrics-68233290-0486-11ee-97a3-c3856dd800f7-system/metrics-system-03ac5d6e-4931-4ace-a034-5e25768db326',
                type: 'input',
                message: 'Healthy',
                status: 'HEALTHY',
                payload: {
                  key: 'val',
                },
              },
            ],
            type: 'system/metrics',
            message: "Healthy: communicating with pid '36'",
            status: 'HEALTHY',
          },
        ],
        last_checkin_message: 'Running',
        last_checkin_status: 'DEGRADED',
        last_checkin: '2023-06-07T08:39:03Z',
        unenrolled_at: '2023-06-07T07:45:30Z',
        unenrollment_started_at: '2023-06-07T07:45:30Z',
        upgraded_at: '2023-06-07T07:45:30Z',
        upgrade_started_at: '2023-06-07T07:45:30Z',
        default_api_key_id: 'EH_RlIgBn_WkCEINY-qh',
        packages: ['system'],
        tags: ['agent'],
        user_provided_metadata: {
          key: 'val',
        },
        default_api_key_history: [
          {
            id: '1',
            retired_at: '',
          },
        ],
      },
      sort: [1686123930000, 'beb13bf6a73e'],
      fields: {
        status: ['online'],
      },
      _id: '504b3006-52df-46a6-b7db-f3dc67aca7ac',
    };
    const agent = searchHitToAgent(hit as any);
    expect(agent).toEqual({
      id: '504b3006-52df-46a6-b7db-f3dc67aca7ac',
      type: 'PERMANENT',
      active: true,
      enrolled_at: '2023-06-07T07:45:30Z',
      access_api_key_id: 'EH_RlIgBn_WkCEINY-qh',
      policy_id: '76c5b020-0486-11ee-97a3-c3856dd800f7',
      last_checkin: '2023-06-07T08:39:03Z',
      last_checkin_status: 'degraded',
      last_checkin_message: 'Running',
      policy_revision: 2,
      sort: [1686123930000, 'beb13bf6a73e'],
      outputs: {
        '68233290-0486-11ee-97a3-c3856dd800f7': {
          api_key_id: 'En_RlIgBn_WkCEINb-pQ',
          type: 'elasticsearch',
          to_retire_api_key_ids: [
            {
              id: '1',
              retired_at: '',
            },
          ],
        },
      },
      components: [
        {
          id: 'system/metrics-68233290-0486-11ee-97a3-c3856dd800f7',
          type: 'system/metrics',
          status: 'HEALTHY',
          message: "Healthy: communicating with pid '36'",
          units: [
            {
              id: 'system/metrics-68233290-0486-11ee-97a3-c3856dd800f7-system/metrics-system-03ac5d6e-4931-4ace-a034-5e25768db326',
              type: 'input',
              status: 'HEALTHY',
              message: 'Healthy',
              payload: {
                key: 'val',
              },
            },
          ],
        },
      ],
      local_metadata: {
        elastic: {
          agent: {
            'build.original':
              '8.9.0-SNAPSHOT (build: 953fda060f317c2389ef6fd1cac8806a2bfe92ac at 2023-05-29 14:51:32 +0000 UTC)',
          },
        },
      },
      status: 'online',
      unenrolled_at: '2023-06-07T07:45:30Z',
      unenrollment_started_at: '2023-06-07T07:45:30Z',
      upgraded_at: '2023-06-07T07:45:30Z',
      upgrade_started_at: '2023-06-07T07:45:30Z',
      default_api_key_id: 'EH_RlIgBn_WkCEINY-qh',
      packages: ['system'],
      tags: ['agent'],
      user_provided_metadata: {
        key: 'val',
      },
      default_api_key_history: [
        {
          id: '1',
          retired_at: '',
        },
      ],
      agent: {
        id: '504b3006-52df-46a6-b7db-f3dc67aca7ac',
        version: '8.9.0',
      },
    });
  });

  it('should work when units is not present', () => {
    const hit = {
      _source: {
        access_api_key_id: 'EH_RlIgBn_WkCEINY-qh',
        active: true,
        enrolled_at: '2023-06-07T07:45:30Z',
        local_metadata: {
          elastic: {
            agent: {
              'build.original':
                '8.9.0-SNAPSHOT (build: 953fda060f317c2389ef6fd1cac8806a2bfe92ac at 2023-05-29 14:51:32 +0000 UTC)',
            },
          },
        },
        agent: {
          id: '504b3006-52df-46a6-b7db-f3dc67aca7ac',
          version: '8.9.0',
        },
        policy_id: '76c5b020-0486-11ee-97a3-c3856dd800f7',
        type: 'PERMANENT',
        outputs: {
          '68233290-0486-11ee-97a3-c3856dd800f7': {
            api_key: 'En_RlIgBn_WkCEINb-pQ:mfeV4ji6RNGyCOBs25gteg',
            permissions_hash: '6ac9e595a2f8cba8893f9ea1fbfb6cba4b4d6f16d935c17a6368f11ee0b0a5d8',
            type: 'elasticsearch',
            api_key_id: 'En_RlIgBn_WkCEINb-pQ',
            to_retire_api_key_ids: [],
          },
        },
        policy_revision_idx: 2,
        components: [
          {
            id: 'system/metrics-68233290-0486-11ee-97a3-c3856dd800f7',
            type: 'system/metrics',
            message: "Healthy: communicating with pid '36'",
            status: 'HEALTHY',
          },
        ],
        last_checkin_message: 'Running',
        last_checkin_status: 'online',
        last_checkin: '2023-06-07T08:39:03Z',
        unenrolled_at: '2023-06-07T07:45:30Z',
        unenrollment_started_at: '2023-06-07T07:45:30Z',
        upgraded_at: '2023-06-07T07:45:30Z',
        upgrade_started_at: '2023-06-07T07:45:30Z',
        default_api_key_id: 'EH_RlIgBn_WkCEINY-qh',
        packages: ['system'],
        tags: ['agent'],
        user_provided_metadata: {
          key: 'val',
        },
        default_api_key_history: [
          {
            retired_at: '',
          },
        ],
      },
      sort: [1686123930000, 'beb13bf6a73e'],
      fields: {
        status: ['online'],
      },
      _id: '504b3006-52df-46a6-b7db-f3dc67aca7ac',
    };
    const agent = searchHitToAgent(hit as any);
    expect(agent).toEqual({
      id: '504b3006-52df-46a6-b7db-f3dc67aca7ac',
      type: 'PERMANENT',
      active: true,
      enrolled_at: '2023-06-07T07:45:30Z',
      access_api_key_id: 'EH_RlIgBn_WkCEINY-qh',
      policy_id: '76c5b020-0486-11ee-97a3-c3856dd800f7',
      last_checkin: '2023-06-07T08:39:03Z',
      last_checkin_status: 'online',
      last_checkin_message: 'Running',
      policy_revision: 2,
      sort: [1686123930000, 'beb13bf6a73e'],
      outputs: {
        '68233290-0486-11ee-97a3-c3856dd800f7': {
          api_key_id: 'En_RlIgBn_WkCEINb-pQ',
          type: 'elasticsearch',
          to_retire_api_key_ids: [],
        },
      },
      components: [
        {
          id: 'system/metrics-68233290-0486-11ee-97a3-c3856dd800f7',
          type: 'system/metrics',
          status: 'HEALTHY',
          message: "Healthy: communicating with pid '36'",
          units: undefined,
        },
      ],
      local_metadata: {
        elastic: {
          agent: {
            'build.original':
              '8.9.0-SNAPSHOT (build: 953fda060f317c2389ef6fd1cac8806a2bfe92ac at 2023-05-29 14:51:32 +0000 UTC)',
          },
        },
      },
      status: 'online',
      unenrolled_at: '2023-06-07T07:45:30Z',
      unenrollment_started_at: '2023-06-07T07:45:30Z',
      upgraded_at: '2023-06-07T07:45:30Z',
      upgrade_started_at: '2023-06-07T07:45:30Z',
      default_api_key_id: 'EH_RlIgBn_WkCEINY-qh',
      packages: ['system'],
      tags: ['agent'],
      user_provided_metadata: {
        key: 'val',
      },
      default_api_key_history: [
        {
          id: undefined,
          retired_at: '',
        },
      ],
      agent: {
        id: '504b3006-52df-46a6-b7db-f3dc67aca7ac',
        version: '8.9.0',
      },
    });
  });
});
