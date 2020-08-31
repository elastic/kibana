/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { getTotalCount } from './actions_telemetry';

describe('actions telemetry', () => {
  test('getTotalCount should replace action types names with . to __', async () => {
    const mockEsClient = jest.fn();
    mockEsClient.mockReturnValue({
      aggregations: {
        byActionTypeId: {
          value: {
            types: { '.index': 1, '.server-log': 1 },
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
  },
  "countTotal": 2,
}
`);
  });
});
