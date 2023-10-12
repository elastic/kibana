/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IEsSearchResponse } from '@kbn/data-plugin/common';
import type { UserAuthenticationsRequestOptions } from '../../../../../../../common/api/search_strategy';
import type { AuthenticationHit } from '../../../../../../../common/search_strategy';
import {
  Direction,
  UsersQueries,
  AuthStackByField,
} from '../../../../../../../common/search_strategy';

export const mockOptions: UserAuthenticationsRequestOptions = {
  defaultIndex: [
    'apm-*-transaction*',
    'traces-apm*',
    'auditbeat-*',
    'endgame-*',
    'filebeat-*',
    'logs-*',
    'packetbeat-*',
    'winlogbeat-*',
  ],
  stackByField: AuthStackByField.userName,
  factoryQueryType: UsersQueries.authentications,
  filterQuery: '{"bool":{"must":[],"filter":[{"match_all":{}}],"should":[],"must_not":[]}}',
  pagination: {
    activePage: 0,
    cursorStart: 0,
    fakePossibleCount: 50,
    querySize: 10,
  },
  timerange: {
    interval: '12h',
    from: '2020-09-02T15:17:13.678Z',
    to: '2020-09-03T15:17:13.678Z',
  },
  sort: {
    direction: Direction.desc,
    field: 'success',
  },
  params: {},
};

export const mockSearchStrategyResponse: IEsSearchResponse<unknown> = {
  isPartial: false,
  isRunning: false,
  rawResponse: {
    took: 14,
    timed_out: false,
    _shards: { total: 21, successful: 21, skipped: 0, failed: 0 },
    hits: { total: -1, max_score: 0, hits: [] },
    aggregations: {
      stack_by: {
        doc_count_error_upper_bound: -1,
        sum_other_doc_count: 408,
        buckets: [
          {
            key: 'SYSTEM',
            doc_count: 281,
            failures: {
              meta: {},
              doc_count: 0,
              lastFailure: { hits: { total: 0, max_score: 0, hits: [] } },
            },
            successes: {
              meta: {},
              doc_count: 4,
              lastSuccess: {
                hits: {
                  total: 4,
                  max_score: 0,
                  hits: [
                    {
                      _index: 'winlogbeat-8.0.0-2020.09.02-000001',
                      _id: 'zqY7WXQBA6bGZw2uLeKI',
                      _score: null,
                      fields: {
                        '@timestamp': ['2020-09-04T13:08:02.532Z'],
                        'host.id': ['ce1d3c9b-a815-4643-9641-ada0f2c00609'],
                        'host.name': ['siem-windows'],
                      },
                      sort: [1599224882532],
                    },
                  ],
                },
              },
            },
          },
          {
            key: 'tsg',
            doc_count: 1,
            failures: {
              doc_count: 0,
              lastFailure: { hits: { total: 0, max_score: 0, hits: [] } },
            },
            successes: {
              doc_count: 1,
              lastSuccess: {
                hits: {
                  total: 1,
                  max_score: 0,
                  hits: [
                    {
                      _index: '.ds-logs-system.auth-default-000001',
                      _id: '9_sfWXQBc39KFIJbIsDh',
                      _score: null,
                      fields: {
                        'source.ip': ['77.183.42.188'],
                        'host.id': ['aa7ca589f1b8220002f2fc61c64cfbf1'],
                        'host.name': ['siem-kibana'],
                        '@timestamp': ['2020-09-04T11:49:21.000Z'],
                      },
                      sort: [1599220161000],
                    },
                  ],
                },
              },
            },
          },
          {
            key: 'admin',
            doc_count: 23,
            failures: {
              doc_count: 23,
              lastFailure: {
                hits: {
                  total: 23,
                  max_score: 0,
                  hits: [
                    {
                      _index: '.ds-logs-system.auth-default-000001',
                      _id: 'ZfxZWXQBc39KFIJbLN5U',
                      _score: null,
                      fields: {
                        'source.ip': ['59.15.3.197'],
                        'host.id': ['aa7ca589f1b8220002f2fc61c64cfbf1'],
                        'host.name': ['siem-kibana'],
                        '@timestamp': ['2020-09-04T13:40:46.000Z'],
                      },
                      sort: [1599226846000],
                    },
                  ],
                },
              },
            },
            successes: {
              doc_count: 0,
              lastSuccess: { hits: { total: 0, max_score: 0, hits: [] } },
            },
          },
          {
            key: 'user',
            doc_count: 21,
            failures: {
              doc_count: 21,
              lastFailure: {
                hits: {
                  total: 21,
                  max_score: 0,
                  hits: [
                    {
                      _index: 'filebeat-8.0.0-2020.09.02-000001',
                      _id: 'M_xLWXQBc39KFIJbY7Cb',
                      _score: null,
                      fields: {
                        'source.ip': ['64.227.88.245'],
                        'host.name': ['bastion00.siem.estc.dev'],
                        '@timestamp': ['2020-09-04T13:25:43.000Z'],
                      },
                      sort: [1599225943000],
                    },
                  ],
                },
              },
            },
            successes: {
              doc_count: 0,
              lastSuccess: { hits: { total: 0, max_score: 0, hits: [] } },
            },
          },
          {
            key: 'ubuntu',
            doc_count: 18,
            failures: {
              doc_count: 18,
              lastFailure: {
                hits: {
                  total: 18,
                  max_score: 0,
                  hits: [
                    {
                      _index: 'filebeat-8.0.0-2020.09.02-000001',
                      _id: 'nPxKWXQBc39KFIJb7q4w',
                      _score: null,
                      fields: {
                        'source.ip': ['64.227.88.245'],
                        'host.name': ['bastion00.siem.estc.dev'],
                        '@timestamp': ['2020-09-04T13:25:07.000Z'],
                      },
                      sort: [1599225907000],
                    },
                  ],
                },
              },
            },
            successes: {
              doc_count: 0,
              lastSuccess: { hits: { total: 0, max_score: 0, hits: [] } },
            },
          },
          {
            key: 'odoo',
            doc_count: 17,
            failures: {
              doc_count: 17,
              lastFailure: {
                hits: {
                  total: 17,
                  max_score: 0,
                  hits: [
                    {
                      _index: '.ds-logs-system.auth-default-000001',
                      _id: 'mPsfWXQBc39KFIJbI8HI',
                      _score: null,
                      fields: {
                        'source.ip': ['180.151.228.166'],
                        'host.id': ['aa7ca589f1b8220002f2fc61c64cfbf1'],
                        'host.name': ['siem-kibana'],
                        '@timestamp': ['2020-09-04T12:26:36.000Z'],
                      },
                      sort: [1599222396000],
                    },
                  ],
                },
              },
            },
            successes: {
              doc_count: 0,
              lastSuccess: { hits: { total: 0, max_score: 0, hits: [] } },
            },
          },
          {
            key: 'pi',
            doc_count: 17,
            failures: {
              doc_count: 17,
              lastFailure: {
                hits: {
                  total: 17,
                  max_score: 0,
                  hits: [
                    {
                      _index: 'filebeat-8.0.0-2020.09.02-000001',
                      _id: 'aaToWHQBA6bGZw2uR-St',
                      _score: null,
                      fields: {
                        'source.ip': ['178.174.148.58'],
                        'host.name': ['bastion00.siem.estc.dev'],
                        '@timestamp': ['2020-09-04T11:37:22.000Z'],
                      },
                      sort: [1599219442000],
                    },
                  ],
                },
              },
            },
            successes: {
              doc_count: 0,
              lastSuccess: { hits: { total: 0, max_score: 0, hits: [] } },
            },
          },
          {
            key: 'demo',
            doc_count: 14,
            failures: {
              doc_count: 14,
              lastFailure: {
                hits: {
                  total: 14,
                  max_score: 0,
                  hits: [
                    {
                      _index: 'filebeat-8.0.0-2020.09.02-000001',
                      _id: 'VaP_V3QBA6bGZw2upUbg',
                      _score: null,
                      fields: {
                        'source.ip': ['45.95.168.157'],
                        'host.name': ['bastion00.siem.estc.dev'],
                        '@timestamp': ['2020-09-04T07:23:22.000Z'],
                      },
                      sort: [1599204202000],
                    },
                  ],
                },
              },
            },
            successes: {
              doc_count: 0,
              lastSuccess: { hits: { total: 0, max_score: 0, hits: [] } },
            },
          },
          {
            key: 'git',
            doc_count: 13,
            failures: {
              doc_count: 13,
              lastFailure: {
                hits: {
                  total: 13,
                  max_score: 0,
                  hits: [
                    {
                      _index: '.ds-logs-system.auth-default-000001',
                      _id: 'PqYfWXQBA6bGZw2uIhVU',
                      _score: null,
                      fields: {
                        'source.ip': ['123.206.30.76'],
                        'host.id': ['aa7ca589f1b8220002f2fc61c64cfbf1'],
                        'host.name': ['siem-kibana'],
                        '@timestamp': ['2020-09-04T11:20:26.000Z'],
                      },
                      sort: [1599218426000],
                    },
                  ],
                },
              },
            },
            successes: {
              doc_count: 0,
              lastSuccess: { hits: { total: 0, max_score: 0, hits: [] } },
            },
          },
          {
            key: 'webadmin',
            doc_count: 13,
            failures: {
              doc_count: 13,
              lastFailure: {
                hits: {
                  total: 13,
                  max_score: 0,
                  hits: [
                    {
                      _index: 'filebeat-8.0.0-2020.09.02-000001',
                      _id: 'iMABWHQBB-gskclyitP-',
                      _score: null,
                      fields: {
                        'source.ip': ['45.95.168.157'],
                        'host.name': ['bastion00.siem.estc.dev'],
                        '@timestamp': ['2020-09-04T07:25:28.000Z'],
                      },
                      sort: [1599204328000],
                    },
                  ],
                },
              },
            },
            successes: {
              doc_count: 0,
              lastSuccess: { hits: { total: 0, max_score: 0, hits: [] } },
            },
          },
        ],
      },
      stack_by_count: { value: 188 },
    },
  },
  total: 21,
  loaded: 21,
};

export const formattedSearchStrategyResponse = {
  isPartial: false,
  isRunning: false,
  rawResponse: {
    took: 14,
    timed_out: false,
    _shards: { total: 21, successful: 21, skipped: 0, failed: 0 },
    hits: { total: -1, max_score: 0, hits: [] },
    aggregations: {
      stack_by: {
        doc_count_error_upper_bound: -1,
        sum_other_doc_count: 408,
        buckets: [
          {
            key: 'SYSTEM',
            doc_count: 281,
            failures: {
              meta: {},
              doc_count: 0,
              lastFailure: { hits: { total: 0, max_score: 0, hits: [] } },
            },
            successes: {
              meta: {},
              doc_count: 4,
              lastSuccess: {
                hits: {
                  total: 4,
                  max_score: 0,
                  hits: [
                    {
                      _index: 'winlogbeat-8.0.0-2020.09.02-000001',
                      _id: 'zqY7WXQBA6bGZw2uLeKI',
                      _score: null,
                      fields: {
                        'host.id': ['ce1d3c9b-a815-4643-9641-ada0f2c00609'],
                        'host.name': ['siem-windows'],
                        '@timestamp': ['2020-09-04T13:08:02.532Z'],
                      },
                      sort: [1599224882532],
                    },
                  ],
                },
              },
            },
          },
          {
            key: 'tsg',
            doc_count: 1,
            failures: {
              doc_count: 0,
              lastFailure: { hits: { total: 0, max_score: 0, hits: [] } },
            },
            successes: {
              doc_count: 1,
              lastSuccess: {
                hits: {
                  total: 1,
                  max_score: 0,
                  hits: [
                    {
                      _index: '.ds-logs-system.auth-default-000001',
                      _id: '9_sfWXQBc39KFIJbIsDh',
                      _score: null,
                      fields: {
                        'source.ip': ['77.183.42.188'],
                        'host.id': ['aa7ca589f1b8220002f2fc61c64cfbf1'],
                        'host.name': ['siem-kibana'],
                        '@timestamp': ['2020-09-04T11:49:21.000Z'],
                      },
                      sort: [1599220161000],
                    },
                  ],
                },
              },
            },
          },
          {
            key: 'admin',
            doc_count: 23,
            failures: {
              doc_count: 23,
              lastFailure: {
                hits: {
                  total: 23,
                  max_score: 0,
                  hits: [
                    {
                      _index: '.ds-logs-system.auth-default-000001',
                      _id: 'ZfxZWXQBc39KFIJbLN5U',
                      _score: null,
                      fields: {
                        'source.ip': ['59.15.3.197'],
                        'host.id': ['aa7ca589f1b8220002f2fc61c64cfbf1'],
                        'host.name': ['siem-kibana'],
                        '@timestamp': ['2020-09-04T13:40:46.000Z'],
                      },
                      sort: [1599226846000],
                    },
                  ],
                },
              },
            },
            successes: {
              doc_count: 0,
              lastSuccess: { hits: { total: 0, max_score: 0, hits: [] } },
            },
          },
          {
            key: 'user',
            doc_count: 21,
            failures: {
              doc_count: 21,
              lastFailure: {
                hits: {
                  total: 21,
                  max_score: 0,
                  hits: [
                    {
                      _index: 'filebeat-8.0.0-2020.09.02-000001',
                      _id: 'M_xLWXQBc39KFIJbY7Cb',
                      _score: null,
                      fields: {
                        'source.ip': ['64.227.88.245'],
                        'host.name': ['bastion00.siem.estc.dev'],
                        '@timestamp': ['2020-09-04T13:25:43.000Z'],
                      },
                      sort: [1599225943000],
                    },
                  ],
                },
              },
            },
            successes: {
              doc_count: 0,
              lastSuccess: { hits: { total: 0, max_score: 0, hits: [] } },
            },
          },
          {
            key: 'ubuntu',
            doc_count: 18,
            failures: {
              doc_count: 18,
              lastFailure: {
                hits: {
                  total: 18,
                  max_score: 0,
                  hits: [
                    {
                      _index: 'filebeat-8.0.0-2020.09.02-000001',
                      _id: 'nPxKWXQBc39KFIJb7q4w',
                      _score: null,
                      fields: {
                        'source.ip': ['64.227.88.245'],
                        'host.name': ['bastion00.siem.estc.dev'],
                        '@timestamp': ['2020-09-04T13:25:07.000Z'],
                      },
                      sort: [1599225907000],
                    },
                  ],
                },
              },
            },
            successes: {
              doc_count: 0,
              lastSuccess: { hits: { total: 0, max_score: 0, hits: [] } },
            },
          },
          {
            key: 'odoo',
            doc_count: 17,
            failures: {
              doc_count: 17,
              lastFailure: {
                hits: {
                  total: 17,
                  max_score: 0,
                  hits: [
                    {
                      _index: '.ds-logs-system.auth-default-000001',
                      _id: 'mPsfWXQBc39KFIJbI8HI',
                      _score: null,
                      fields: {
                        'source.ip': ['180.151.228.166'],
                        'host.id': ['aa7ca589f1b8220002f2fc61c64cfbf1'],
                        'host.name': ['siem-kibana'],
                        '@timestamp': ['2020-09-04T12:26:36.000Z'],
                      },
                      sort: [1599222396000],
                    },
                  ],
                },
              },
            },
            successes: {
              doc_count: 0,
              lastSuccess: { hits: { total: 0, max_score: 0, hits: [] } },
            },
          },
          {
            key: 'pi',
            doc_count: 17,
            failures: {
              doc_count: 17,
              lastFailure: {
                hits: {
                  total: 17,
                  max_score: 0,
                  hits: [
                    {
                      _index: 'filebeat-8.0.0-2020.09.02-000001',
                      _id: 'aaToWHQBA6bGZw2uR-St',
                      _score: null,
                      fields: {
                        'source.ip': ['178.174.148.58'],
                        'host.name': ['bastion00.siem.estc.dev'],
                        '@timestamp': ['2020-09-04T11:37:22.000Z'],
                      },
                      sort: [1599219442000],
                    },
                  ],
                },
              },
            },
            successes: {
              doc_count: 0,
              lastSuccess: { hits: { total: 0, max_score: 0, hits: [] } },
            },
          },
          {
            key: 'demo',
            doc_count: 14,
            failures: {
              doc_count: 14,
              lastFailure: {
                hits: {
                  total: 14,
                  max_score: 0,
                  hits: [
                    {
                      _index: 'filebeat-8.0.0-2020.09.02-000001',
                      _id: 'VaP_V3QBA6bGZw2upUbg',
                      _score: null,
                      fields: {
                        'source.ip': ['45.95.168.157'],
                        'host.name': ['bastion00.siem.estc.dev'],
                        '@timestamp': ['2020-09-04T07:23:22.000Z'],
                      },
                      sort: [1599204202000],
                    },
                  ],
                },
              },
            },
            successes: {
              doc_count: 0,
              lastSuccess: { hits: { total: 0, max_score: 0, hits: [] } },
            },
          },
          {
            key: 'git',
            doc_count: 13,
            failures: {
              doc_count: 13,
              lastFailure: {
                hits: {
                  total: 13,
                  max_score: 0,
                  hits: [
                    {
                      _index: '.ds-logs-system.auth-default-000001',
                      _id: 'PqYfWXQBA6bGZw2uIhVU',
                      _score: null,
                      fields: {
                        'source.ip': ['123.206.30.76'],
                        'host.id': ['aa7ca589f1b8220002f2fc61c64cfbf1'],
                        'host.name': ['siem-kibana'],
                        '@timestamp': ['2020-09-04T11:20:26.000Z'],
                      },
                      sort: [1599218426000],
                    },
                  ],
                },
              },
            },
            successes: {
              doc_count: 0,
              lastSuccess: { hits: { total: 0, max_score: 0, hits: [] } },
            },
          },
          {
            key: 'webadmin',
            doc_count: 13,
            failures: {
              doc_count: 13,
              lastFailure: {
                hits: {
                  total: 13,
                  max_score: 0,
                  hits: [
                    {
                      _index: 'filebeat-8.0.0-2020.09.02-000001',
                      _id: 'iMABWHQBB-gskclyitP-',
                      _score: null,
                      fields: {
                        'source.ip': ['45.95.168.157'],
                        'host.name': ['bastion00.siem.estc.dev'],
                        '@timestamp': ['2020-09-04T07:25:28.000Z'],
                      },
                      sort: [1599204328000],
                    },
                  ],
                },
              },
            },
            successes: {
              doc_count: 0,
              lastSuccess: { hits: { total: 0, max_score: 0, hits: [] } },
            },
          },
        ],
      },
      stack_by_count: { value: 188 },
    },
  },
  total: 21,
  loaded: 21,
  inspect: {
    dsl: [
      JSON.stringify(
        {
          allow_no_indices: true,
          index: [
            'apm-*-transaction*',
            'traces-apm*',
            'auditbeat-*',
            'endgame-*',
            'filebeat-*',
            'logs-*',
            'packetbeat-*',
            'winlogbeat-*',
          ],
          ignore_unavailable: true,
          body: {
            aggregations: {
              stack_by_count: { cardinality: { field: 'user.name' } },
              stack_by: {
                terms: {
                  size: 10,
                  field: 'user.name',
                  order: [{ 'successes.doc_count': 'desc' }, { 'failures.doc_count': 'desc' }],
                },
                aggs: {
                  failures: {
                    filter: { term: { 'event.outcome': 'failure' } },
                    aggs: {
                      lastFailure: {
                        top_hits: {
                          size: 1,
                          _source: false,
                          sort: [{ '@timestamp': { order: 'desc' } }],
                        },
                      },
                    },
                  },
                  successes: {
                    filter: { term: { 'event.outcome': 'success' } },
                    aggs: {
                      lastSuccess: {
                        top_hits: {
                          size: 1,
                          _source: false,
                          sort: [{ '@timestamp': { order: 'desc' } }],
                        },
                      },
                    },
                  },
                },
              },
            },
            query: {
              bool: {
                filter: [
                  { bool: { must: [], filter: [{ match_all: {} }], should: [], must_not: [] } },
                  { term: { 'event.category': 'authentication' } },
                  {
                    range: {
                      '@timestamp': {
                        gte: '2020-09-02T15:17:13.678Z',
                        lte: '2020-09-03T15:17:13.678Z',
                        format: 'strict_date_optional_time',
                      },
                    },
                  },
                ],
              },
            },
            size: 0,
            _source: false,
            fields: [
              'source.ip',
              'host.id',
              'host.name',
              {
                field: '@timestamp',
                format: 'strict_date_optional_time',
              },
            ],
          },
          track_total_hits: false,
        },
        null,
        2
      ),
    ],
  },
  edges: [
    {
      node: {
        failures: 0,
        successes: 4,
        _id: 'SYSTEM+281',
        stackedValue: ['SYSTEM'],
        lastSuccess: {
          timestamp: ['2020-09-04T13:08:02.532Z'],
          host: { id: ['ce1d3c9b-a815-4643-9641-ada0f2c00609'], name: ['siem-windows'] },
        },
      },
      cursor: { value: undefined, tiebreaker: null },
    },
    {
      node: {
        failures: 0,
        successes: 1,
        _id: 'tsg+1',
        stackedValue: ['tsg'],
        lastSuccess: {
          timestamp: ['2020-09-04T11:49:21.000Z'],
          source: { ip: ['77.183.42.188'] },
          host: { id: ['aa7ca589f1b8220002f2fc61c64cfbf1'], name: ['siem-kibana'] },
        },
      },
      cursor: { value: undefined, tiebreaker: null },
    },
    {
      node: {
        failures: 23,
        successes: 0,
        _id: 'ZfxZWXQBc39KFIJbLN5U',
        stackedValue: ['admin'],
        lastFailure: {
          timestamp: ['2020-09-04T13:40:46.000Z'],
          source: { ip: ['59.15.3.197'] },
          host: { id: ['aa7ca589f1b8220002f2fc61c64cfbf1'], name: ['siem-kibana'] },
        },
      },
      cursor: { value: undefined, tiebreaker: null },
    },
    {
      node: {
        failures: 21,
        successes: 0,
        _id: 'M_xLWXQBc39KFIJbY7Cb',
        stackedValue: ['user'],
        lastFailure: {
          timestamp: ['2020-09-04T13:25:43.000Z'],
          source: { ip: ['64.227.88.245'] },
          host: { name: ['bastion00.siem.estc.dev'] },
        },
      },
      cursor: { value: undefined, tiebreaker: null },
    },
    {
      node: {
        failures: 18,
        successes: 0,
        _id: 'nPxKWXQBc39KFIJb7q4w',
        stackedValue: ['ubuntu'],
        lastFailure: {
          timestamp: ['2020-09-04T13:25:07.000Z'],
          source: { ip: ['64.227.88.245'] },
          host: { name: ['bastion00.siem.estc.dev'] },
        },
      },
      cursor: { value: undefined, tiebreaker: null },
    },
    {
      node: {
        failures: 17,
        successes: 0,
        _id: 'mPsfWXQBc39KFIJbI8HI',
        stackedValue: ['odoo'],
        lastFailure: {
          timestamp: ['2020-09-04T12:26:36.000Z'],
          source: { ip: ['180.151.228.166'] },
          host: { id: ['aa7ca589f1b8220002f2fc61c64cfbf1'], name: ['siem-kibana'] },
        },
      },
      cursor: { value: undefined, tiebreaker: null },
    },
    {
      node: {
        failures: 17,
        successes: 0,
        _id: 'aaToWHQBA6bGZw2uR-St',
        stackedValue: ['pi'],
        lastFailure: {
          timestamp: ['2020-09-04T11:37:22.000Z'],
          source: { ip: ['178.174.148.58'] },
          host: { name: ['bastion00.siem.estc.dev'] },
        },
      },
      cursor: { value: undefined, tiebreaker: null },
    },
    {
      node: {
        failures: 14,
        successes: 0,
        _id: 'VaP_V3QBA6bGZw2upUbg',
        stackedValue: ['demo'],
        lastFailure: {
          timestamp: ['2020-09-04T07:23:22.000Z'],
          source: { ip: ['45.95.168.157'] },
          host: { name: ['bastion00.siem.estc.dev'] },
        },
      },
      cursor: { value: undefined, tiebreaker: null },
    },
    {
      node: {
        failures: 13,
        successes: 0,
        _id: 'PqYfWXQBA6bGZw2uIhVU',
        stackedValue: ['git'],
        lastFailure: {
          timestamp: ['2020-09-04T11:20:26.000Z'],
          source: { ip: ['123.206.30.76'] },
          host: { id: ['aa7ca589f1b8220002f2fc61c64cfbf1'], name: ['siem-kibana'] },
        },
      },
      cursor: { value: undefined, tiebreaker: null },
    },
    {
      node: {
        failures: 13,
        successes: 0,
        _id: 'iMABWHQBB-gskclyitP-',
        stackedValue: ['webadmin'],
        lastFailure: {
          timestamp: ['2020-09-04T07:25:28.000Z'],
          source: { ip: ['45.95.168.157'] },
          host: { name: ['bastion00.siem.estc.dev'] },
        },
      },
      cursor: { value: undefined, tiebreaker: null },
    },
  ],
  totalCount: 188,
  pageInfo: { activePage: 0, fakeTotalCount: 50, showMorePagesIndicator: true },
};

export const expectedDsl = {
  allow_no_indices: true,
  index: [
    'apm-*-transaction*',
    'traces-apm*',
    'auditbeat-*',
    'endgame-*',
    'filebeat-*',
    'logs-*',
    'packetbeat-*',
    'winlogbeat-*',
  ],
  ignore_unavailable: true,
  body: {
    aggregations: {
      stack_by_count: { cardinality: { field: 'user.name' } },
      stack_by: {
        terms: {
          size: 10,
          field: 'user.name',
          order: [{ 'successes.doc_count': 'desc' }, { 'failures.doc_count': 'desc' }],
        },
        aggs: {
          failures: {
            filter: { term: { 'event.outcome': 'failure' } },
            aggs: {
              lastFailure: {
                top_hits: { size: 1, _source: false, sort: [{ '@timestamp': { order: 'desc' } }] },
              },
            },
          },
          successes: {
            filter: { term: { 'event.outcome': 'success' } },
            aggs: {
              lastSuccess: {
                top_hits: { size: 1, _source: false, sort: [{ '@timestamp': { order: 'desc' } }] },
              },
            },
          },
        },
      },
    },
    query: {
      bool: {
        filter: [
          { bool: { must: [], filter: [{ match_all: {} }], should: [], must_not: [] } },
          { term: { 'event.category': 'authentication' } },
          {
            range: {
              '@timestamp': {
                gte: '2020-09-02T15:17:13.678Z',
                lte: '2020-09-03T15:17:13.678Z',
                format: 'strict_date_optional_time',
              },
            },
          },
        ],
      },
    },
    _source: false,
    fields: [
      'source.ip',
      'host.id',
      'host.name',
      {
        field: '@timestamp',
        format: 'strict_date_optional_time',
      },
    ],
    size: 0,
  },
  track_total_hits: false,
};

export const mockHit: AuthenticationHit = {
  _index: 'index-123',
  _type: 'type-123',
  _id: 'id-123',
  _score: 10,
  fields: {
    '@timestamp': 'time-1',
  },
  cursor: 'cursor-1',
  sort: [0],
  stackedValue: 'Evan',
  failures: 10,
  successes: 20,
};
