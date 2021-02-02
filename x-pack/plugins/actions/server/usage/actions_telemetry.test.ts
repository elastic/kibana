/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { getInUseTotalCount, getTotalCount } from './actions_telemetry';

describe('actions telemetry', () => {
  test('getTotalCount should replace first symbol . to __ for action types names', async () => {
    const mockEsClient = jest.fn();
    mockEsClient.mockReturnValue({
      aggregations: {
        byActionTypeId: {
          value: {
            types: { '.index': 1, '.server-log': 1, 'some.type': 1, 'another.type.': 1 },
          },
        },
      },
      hits: {
        hits: [
          {
            _id: 'action:541efb3d-f82a-4d2c-a5c3-636d1ce49b53',
            _index: '.kibana_1',
            _score: 0,
            _source: {
              action: {
                actionTypeId: '.index',
                config: {
                  index: 'kibana_sample_data_ecommerce',
                  refresh: true,
                  executionTimeField: null,
                },
                name: 'test',
                secrets:
                  'UPyn6cit6zBTPMmldfKh/8S2JWypwaLhhEQWBXp+OyTc6TtLHOnW92wehCqTq1FhIY3vA8hwVsggj+tbIoCcfPArpzP5SO7hh8vd6pY13x5TkiM083UgjjaAxbPvKQ==',
              },
              references: [],
              type: 'action',
              updated_at: '2020-03-26T18:46:44.449Z',
            },
          },
          {
            _id: 'action:00000000-f82a-4d2c-a5c3-636d1ce49b53',
            _index: '.kibana_1',
            _score: 0,
            _source: {
              action: {
                actionTypeId: '.server-log',
                config: {},
                name: 'test server log',
                secrets: '',
              },
              references: [],
              type: 'action',
              updated_at: '2020-03-26T18:46:44.449Z',
            },
          },
          {
            _id: 'action:00000000-1',
            _index: '.kibana_1',
            _score: 0,
            _source: {
              action: {
                actionTypeId: 'some.type',
                config: {},
                name: 'test type',
                secrets: {},
              },
              references: [],
              type: 'action',
              updated_at: '2020-03-26T18:46:44.449Z',
            },
          },
          {
            _id: 'action:00000000-2',
            _index: '.kibana_1',
            _score: 0,
            _source: {
              action: {
                actionTypeId: 'another.type.',
                config: {},
                name: 'test another type',
                secrets: {},
              },
              references: [],
              type: 'action',
              updated_at: '2020-03-26T18:46:44.449Z',
            },
          },
        ],
      },
    });

    const telemetry = await getTotalCount(mockEsClient, 'test');

    expect(mockEsClient).toHaveBeenCalledTimes(1);

    expect(telemetry).toMatchInlineSnapshot(`
Object {
  "countByType": Object {
    "__index": 1,
    "__server-log": 1,
    "another.type__": 1,
    "some.type": 1,
  },
  "countTotal": 4,
}
`);
  });

  test('getInUseTotalCount', async () => {
    const mockEsClient = jest.fn();
    mockEsClient.mockReturnValue({
      aggregations: {
        refs: {
          actionRefIds: {
            value: {
              connectorIds: { '1': 'action-0', '123': 'action-0' },
              total: 2,
            },
          },
        },
        hits: {
          hits: [],
        },
      },
    });
    const actionsBulkGet = jest.fn();
    actionsBulkGet.mockReturnValue({
      saved_objects: [
        {
          id: '1',
          attributes: {
            actionTypeId: '.server-log',
          },
        },
        {
          id: '123',
          attributes: {
            actionTypeId: '.slack',
          },
        },
      ],
    });
    const telemetry = await getInUseTotalCount(mockEsClient, actionsBulkGet, 'test');

    expect(mockEsClient).toHaveBeenCalledTimes(1);
    expect(actionsBulkGet).toHaveBeenCalledTimes(1);

    expect(telemetry).toMatchInlineSnapshot(`
Object {
  "countByType": Object {
    "__server-log": 1,
    "__slack": 1,
  },
  "countTotal": 2,
}
`);
  });
});
