/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// eslint-disable-next-line @kbn/eslint/no-restricted-paths
import { elasticsearchClientMock } from '../../../../../src/core/server/elasticsearch/client/mocks';
import { getExecutionsPerDayCount, getInUseTotalCount, getTotalCount } from './actions_telemetry';

describe('actions telemetry', () => {
  test('getTotalCount should replace first symbol . to __ for action types names', async () => {
    const mockEsClient = elasticsearchClientMock.createClusterClient().asScoped().asInternalUser;
    mockEsClient.search.mockResponse(
      // @ts-expect-error not full search response
      {
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
      }
    );
    const telemetry = await getTotalCount(mockEsClient, 'test');

    expect(mockEsClient.search).toHaveBeenCalledTimes(1);

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
    const mockEsClient = elasticsearchClientMock.createClusterClient().asScoped().asInternalUser;
    mockEsClient.search.mockResponseOnce(
      // @ts-expect-error not full search response
      {
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
      }
    );

    mockEsClient.search.mockResponse({
      hits: {
        hits: [
          // @ts-expect-error not full search response
          {
            _source: {
              action: {
                id: '1',
                actionTypeId: '.server-log',
              },
              namespaces: ['default'],
            },
          },
          // @ts-expect-error not full search response
          {
            _source: {
              action: {
                id: '2',
                actionTypeId: '.slack',
              },
              namespaces: ['default'],
            },
          },
        ],
      },
    });
    const telemetry = await getInUseTotalCount(mockEsClient, 'test');

    expect(mockEsClient.search).toHaveBeenCalledTimes(2);
    expect(telemetry).toMatchInlineSnapshot(`
Object {
  "countByAlertHistoryConnectorType": 0,
  "countByType": Object {
    "__server-log": 1,
    "__slack": 1,
  },
  "countEmailByService": Object {},
  "countNamespaces": 1,
  "countTotal": 2,
}
`);
  });

  test('getInUseTotalCount should count preconfigured alert history connector usage', async () => {
    const mockEsClient = elasticsearchClientMock.createClusterClient().asScoped().asInternalUser;
    mockEsClient.search.mockResponseOnce(
      // @ts-expect-error not full search response
      {
        aggregations: {
          refs: {
            actionRefIds: {
              value: {
                connectorIds: {
                  '1': 'action_0',
                  '123': 'action_1',
                  'preconfigured-alert-history-es-index': 'action_2',
                },
                total: 3,
              },
            },
          },
          preconfigured_actions: {
            preconfiguredActionRefIds: {
              value: {
                total: 1,
                actionRefs: {
                  'preconfigured:preconfigured-alert-history-es-index': {
                    actionRef: 'preconfigured:preconfigured-alert-history-es-index',
                    actionTypeId: '.index',
                  },
                },
              },
            },
          },
        },
      }
    );
    mockEsClient.search.mockResponseOnce({
      hits: {
        hits: [
          // @ts-expect-error not full search response
          {
            _source: {
              action: {
                id: '1',
                actionTypeId: '.server-log',
              },
              namespaces: ['default'],
            },
          },
          // @ts-expect-error not full search response
          {
            _source: {
              action: {
                id: '2',
                actionTypeId: '.slack',
              },
              namespaces: ['default'],
            },
          },
        ],
      },
    });
    const telemetry = await getInUseTotalCount(mockEsClient, 'test', undefined, [
      {
        id: 'test',
        actionTypeId: '.email',
        name: 'test',
        isPreconfigured: true,
        config: {
          tenantId: 'sdsd',
          clientId: 'sdfsdf',
        },
        secrets: {
          clientSecret: 'sdfsdf',
        },
      },
      {
        id: 'anotherServerLog',
        actionTypeId: '.server-log',
        name: 'test',
        isPreconfigured: true,
        secrets: {},
      },
    ]);

    expect(mockEsClient.search).toHaveBeenCalledTimes(2);
    expect(telemetry).toMatchInlineSnapshot(`
Object {
  "countByAlertHistoryConnectorType": 1,
  "countByType": Object {
    "__index": 1,
    "__server-log": 1,
    "__slack": 1,
  },
  "countEmailByService": Object {},
  "countNamespaces": 1,
  "countTotal": 4,
}
`);
  });

  test('getTotalCount accounts for preconfigured connectors', async () => {
    const mockEsClient = elasticsearchClientMock.createClusterClient().asScoped().asInternalUser;
    mockEsClient.search.mockResponse(
      // @ts-expect-error not full search response
      {
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
      }
    );
    const telemetry = await getTotalCount(mockEsClient, 'test', [
      {
        id: 'test',
        actionTypeId: '.test',
        name: 'test',
        isPreconfigured: true,
        secrets: {},
      },
      {
        id: 'anotherServerLog',
        actionTypeId: '.server-log',
        name: 'test',
        isPreconfigured: true,
        secrets: {},
      },
    ]);

    expect(mockEsClient.search).toHaveBeenCalledTimes(1);

    expect(telemetry).toMatchInlineSnapshot(`
Object {
  "countByType": Object {
    "__index": 1,
    "__server-log": 2,
    "__test": 1,
    "another.type__": 1,
    "some.type": 1,
  },
  "countTotal": 6,
}
`);
  });

  test('getInUseTotalCount() accounts for preconfigured connectors', async () => {
    const mockEsClient = elasticsearchClientMock.createClusterClient().asScoped().asInternalUser;
    mockEsClient.search.mockResponseOnce(
      // @ts-expect-error not full search response
      {
        aggregations: {
          refs: {
            actionRefIds: {
              value: {
                connectorIds: {
                  '1': 'action-0',
                  '123': 'action-1',
                  '456': 'action-2',
                },
                total: 3,
              },
            },
          },
          preconfigured_actions: {
            preconfiguredActionRefIds: {
              value: {
                total: 3,
                actionRefs: {
                  'preconfigured:preconfigured-alert-history-es-index': {
                    actionRef: 'preconfigured:preconfigured-alert-history-es-index',
                    actionTypeId: '.index',
                  },
                  'preconfigured:cloud_email': {
                    actionRef: 'preconfigured:cloud_email',
                    actionTypeId: '.email',
                  },
                  'preconfigured:cloud_email2': {
                    actionRef: 'preconfigured:cloud_email2',
                    actionTypeId: '.email',
                  },
                },
              },
            },
          },
        },
      }
    );
    mockEsClient.search.mockResponseOnce({
      hits: {
        hits: [
          // @ts-expect-error not full search response
          {
            _source: {
              action: {
                id: '1',
                actionTypeId: '.server-log',
              },
              namespaces: ['default'],
            },
          },
          // @ts-expect-error not full search response
          {
            _source: {
              action: {
                id: '2',
                actionTypeId: '.slack',
              },
              namespaces: ['default'],
            },
          },
          // @ts-expect-error not full search response
          {
            _source: {
              action: {
                id: '3',
                actionTypeId: '.email',
              },
              namespaces: ['default'],
            },
          },
        ],
      },
    });
    const telemetry = await getInUseTotalCount(mockEsClient, 'test', undefined, [
      {
        id: 'anotherServerLog',
        actionTypeId: '.server-log',
        name: 'test',
        isPreconfigured: true,
        secrets: {},
      },
    ]);

    expect(mockEsClient.search).toHaveBeenCalledTimes(2);
    expect(telemetry).toMatchInlineSnapshot(`
Object {
  "countByAlertHistoryConnectorType": 1,
  "countByType": Object {
    "__email": 3,
    "__index": 1,
    "__server-log": 1,
    "__slack": 1,
  },
  "countEmailByService": Object {
    "other": 3,
  },
  "countNamespaces": 1,
  "countTotal": 6,
}
`);
  });

  test('getInUseTotalCount() accounts for actions namespaces', async () => {
    const mockEsClient = elasticsearchClientMock.createClusterClient().asScoped().asInternalUser;
    mockEsClient.search.mockResponseOnce(
      // @ts-expect-error not full search response
      {
        aggregations: {
          refs: {
            actionRefIds: {
              value: {
                connectorIds: {
                  '1': 'action-0',
                  '123': 'action-1',
                  '456': 'action-2',
                },
                total: 3,
              },
            },
          },
          preconfigured_actions: {
            preconfiguredActionRefIds: {
              value: {
                total: 3,
                actionRefs: {
                  'preconfigured:preconfigured-alert-history-es-index': {
                    actionRef: 'preconfigured:preconfigured-alert-history-es-index',
                    actionTypeId: '.index',
                  },
                  'preconfigured:cloud_email': {
                    actionRef: 'preconfigured:cloud_email',
                    actionTypeId: '.email',
                  },
                  'preconfigured:cloud_email2': {
                    actionRef: 'preconfigured:cloud_email2',
                    actionTypeId: '.email',
                  },
                },
              },
            },
          },
        },
      }
    );
    mockEsClient.search.mockResponseOnce({
      hits: {
        hits: [
          // @ts-expect-error not full search response
          {
            _source: {
              action: {
                id: '1',
                actionTypeId: '.server-log',
              },
              namespaces: ['test'],
            },
          },
          // @ts-expect-error not full search response
          {
            _source: {
              action: {
                id: '2',
                actionTypeId: '.slack',
              },
              namespaces: ['default'],
            },
          },
          // @ts-expect-error not full search response
          {
            _source: {
              action: {
                id: '3',
                actionTypeId: '.email',
              },
              namespaces: ['test2'],
            },
          },
        ],
      },
    });
    const telemetry = await getInUseTotalCount(mockEsClient, 'test');

    expect(mockEsClient.search).toHaveBeenCalledTimes(2);
    expect(telemetry).toMatchInlineSnapshot(`
Object {
  "countByAlertHistoryConnectorType": 1,
  "countByType": Object {
    "__email": 3,
    "__index": 1,
    "__server-log": 1,
    "__slack": 1,
  },
  "countEmailByService": Object {
    "other": 1,
  },
  "countNamespaces": 3,
  "countTotal": 6,
}
`);
  });

  test('getExecutionsTotalCount', async () => {
    const mockEsClient = elasticsearchClientMock.createClusterClient().asScoped().asInternalUser;
    mockEsClient.search.mockResponseOnce(
      // @ts-expect-error not full search response
      {
        aggregations: {
          totalExecutions: {
            byConnectorTypeId: {
              value: {
                connectorTypes: {
                  '.slack': 100,
                  '.server-log': 20,
                },
                total: 120,
              },
            },
          },
          failedExecutions: {
            refs: {
              byConnectorTypeId: {
                value: {
                  connectorTypes: {
                    '.slack': 7,
                  },
                  total: 7,
                },
              },
            },
          },
          avgDuration: { value: 10 },
          avgDurationByType: {
            doc_count: 216,
            actionSavedObjects: {
              doc_count: 108,
              byTypeId: {
                doc_count_error_upper_bound: 0,
                sum_other_doc_count: 0,
                buckets: [
                  {
                    key: '.server-log',
                    doc_count: 99,
                    refs: {
                      doc_count: 99,
                      avgDuration: {
                        value: 919191.9191919192,
                      },
                    },
                  },
                  {
                    key: '.email',
                    doc_count: 9,
                    refs: {
                      doc_count: 9,
                      avgDuration: {
                        value: 4.196666666666667e8,
                      },
                    },
                  },
                ],
              },
            },
          },
        },
      }
    );

    // for .slack connectors
    mockEsClient.search.mockResponseOnce(
      // @ts-expect-error not full search response
      {
        aggregations: {
          avgDuration: { value: 10 },
        },
      }
    );
    const telemetry = await getExecutionsPerDayCount(mockEsClient, 'test');

    expect(mockEsClient.search).toHaveBeenCalledTimes(1);
    expect(telemetry).toStrictEqual({
      avgExecutionTime: 0,
      avgExecutionTimeByType: {
        '__server-log': 919191.9191919192,
        __email: 419666666.6666667,
      },

      countByType: {
        __slack: 100,

        '__server-log': 20,
      },
      countFailed: 7,
      countFailedByType: {
        __slack: 7,
      },
      countTotal: 120,
    });
  });
});
