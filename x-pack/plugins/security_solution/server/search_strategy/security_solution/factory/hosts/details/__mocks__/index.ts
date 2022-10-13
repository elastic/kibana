/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IEsSearchResponse } from '@kbn/data-plugin/common';
import type {
  HostDetailsRequestOptions,
  SortField,
  HostsFields,
} from '../../../../../../../common/search_strategy';
import { Direction, HostsQueries } from '../../../../../../../common/search_strategy';

export const mockOptions: HostDetailsRequestOptions = {
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
  factoryQueryType: HostsQueries.details,
  filterQuery:
    '{"bool":{"must":[],"filter":[{"match_all":{}},{"match_phrase":{"host.name":{"query":"bastion00.siem.estc.dev"}}}],"should":[],"must_not":[]}}',
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
  } as unknown as SortField<HostsFields>,
  params: {},
  hostName: 'bastion00.siem.estc.dev',
} as HostDetailsRequestOptions;

export const mockSearchStrategyResponse: IEsSearchResponse<unknown> = {
  isPartial: false,
  isRunning: false,
  rawResponse: {
    took: 14,
    timed_out: false,
    _shards: { total: 21, successful: 21, skipped: 0, failed: 0 },
    hits: { total: -1, max_score: 0, hits: [] },
    aggregations: {
      group_by_users: {
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
                        'agent.id': ['05e1bff7-d7a8-416a-8554-aa10288fa07d'],
                        'host.architecture': ['x86_64'],
                        'host.id': ['ce1d3c9b-a815-4643-9641-ada0f2c00609'],
                        'host.ip': ['fe80::ecf5:decc:3ec3:767e', '10.200.0.15'],
                        'host.mac': ['42:01:0a:c8:00:0f'],
                        'host.name': ['siem-windows'],
                        'host.os.family': ['windows'],
                        'host.os.name': ['Windows Server 2019 Datacenter'],
                        'host.os.platform': ['windows'],
                        'host.os.version': ['10.0'],
                        'cloud.instance.id': ['9156726559029788564'],
                        'cloud.machine.type': ['g1-small'],
                        'cloud.provider': ['gcp'],
                        '@timestamp': '2020-09-04T13:08:02.532Z',
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
            failures: { doc_count: 0, lastFailure: { hits: { total: 0, max_score: 0, hits: [] } } },
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
                        'agent.id': ['aa3d9dc7-fef1-4c2f-a68d-25785d624e35'],
                        'host.architecture': ['x86_64'],
                        'host.id': ['aa7ca589f1b8220002f2fc61c64cfbf1'],
                        'host.ip': ['10.142.0.7', 'fe80::4001:aff:fe8e:7'],
                        'host.mac': ['42:01:0a:8e:00:07'],
                        'host.name': ['siem-kibana'],
                        'host.os.family': ['debian'],
                        'host.os.name': ['Debian GNU/Linux'],
                        'host.os.platform': ['debian'],
                        'host.os.version': ['9 (stretch)'],
                        'cloud.instance.id': ['5412578377715150143'],
                        'cloud.machine.type': ['n1-standard-2'],
                        'cloud.provider': ['gcp'],
                        '@timestamp': '2020-09-04T11:49:21.000Z',
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
                        'agent.id': ['aa3d9dc7-fef1-4c2f-a68d-25785d624e35'],
                        'host.architecture': ['x86_64'],
                        'host.id': ['aa7ca589f1b8220002f2fc61c64cfbf1'],
                        'host.ip': ['10.142.0.7', 'fe80::4001:aff:fe8e:7'],
                        'host.mac': ['42:01:0a:8e:00:07'],
                        'host.name': ['siem-kibana'],
                        'host.os.family': ['debian'],
                        'host.os.name': ['Debian GNU/Linux'],
                        'host.os.platform': ['debian'],
                        'host.os.version': ['9 (stretch)'],
                        'cloud.instance.id': ['5412578377715150143'],
                        'cloud.machine.type': ['n1-standard-2'],
                        'cloud.provider': ['gcp'],
                        '@timestamp': '2020-09-04T13:40:46.000Z',
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
                        'agent.id': ['f9a321c1-ec27-49fa-aacf-6a50ef6d836f'],
                        'host.name': ['bastion00.siem.estc.dev'],
                        '@timestamp': '2020-09-04T13:25:43.000Z',
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
                        'agent.id': ['f9a321c1-ec27-49fa-aacf-6a50ef6d836f'],
                        'host.name': ['bastion00.siem.estc.dev'],
                        '@timestamp': '2020-09-04T13:25:07.000Z',
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
                        'agent.id': ['aa3d9dc7-fef1-4c2f-a68d-25785d624e35'],
                        'host.architecture': ['x86_64'],
                        'host.id': ['aa7ca589f1b8220002f2fc61c64cfbf1'],
                        'host.ip': ['10.142.0.7', 'fe80::4001:aff:fe8e:7'],
                        'host.mac': ['42:01:0a:8e:00:07'],
                        'host.name': ['siem-kibana'],
                        'host.os.family': ['debian'],
                        'host.os.name': ['Debian GNU/Linux'],
                        'host.os.platform': ['debian'],
                        'host.os.version': ['9 (stretch)'],
                        'cloud.instance.id': ['5412578377715150143'],
                        'cloud.machine.type': ['n1-standard-2'],
                        'cloud.provider': ['gcp'],
                        '@timestamp': '2020-09-04T12:26:36.000Z',
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
                        'agent.id': ['f9a321c1-ec27-49fa-aacf-6a50ef6d836f'],
                        'host.name': ['bastion00.siem.estc.dev'],
                        '@timestamp': '2020-09-04T11:37:22.000Z',
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
                        'agent.id': ['f9a321c1-ec27-49fa-aacf-6a50ef6d836f'],
                        'host.name': ['bastion00.siem.estc.dev'],
                        '@timestamp': '2020-09-04T07:23:22.000Z',
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
                        'agent.id': ['aa3d9dc7-fef1-4c2f-a68d-25785d624e35'],
                        'host.architecture': ['x86_64'],
                        'host.id': ['aa7ca589f1b8220002f2fc61c64cfbf1'],
                        'host.ip': ['10.142.0.7', 'fe80::4001:aff:fe8e:7'],
                        'host.mac': ['42:01:0a:8e:00:07'],
                        'host.name': ['siem-kibana'],
                        'host.os.family': ['debian'],
                        'host.os.name': ['Debian GNU/Linux'],
                        'host.os.platform': ['debian'],
                        'host.os.version': ['9 (stretch)'],
                        'cloud.instance.id': ['5412578377715150143'],
                        'cloud.machine.type': ['n1-standard-2'],
                        'cloud.provider': ['gcp'],
                        '@timestamp': '2020-09-04T11:20:26.000Z',
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
                        'agent.id': ['f9a321c1-ec27-49fa-aacf-6a50ef6d836f'],
                        'host.name': ['bastion00.siem.estc.dev'],
                        '@timestamp': '2020-09-04T07:25:28.000Z',
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
      user_count: { value: 188 },
    },
  },
  total: 21,
  loaded: 21,
};

export const formattedSearchStrategyResponse = {
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
          track_total_hits: false,
          body: {
            aggregations: {
              host_architecture: {
                terms: { field: 'host.architecture', size: 10, order: { timestamp: 'desc' } },
                aggs: { timestamp: { max: { field: '@timestamp' } } },
              },
              host_id: {
                terms: { field: 'host.id', size: 10, order: { timestamp: 'desc' } },
                aggs: { timestamp: { max: { field: '@timestamp' } } },
              },
              host_ip: {
                terms: {
                  script: { source: "doc['host.ip']", lang: 'painless' },
                  size: 10,
                  order: { timestamp: 'desc' },
                },
                aggs: { timestamp: { max: { field: '@timestamp' } } },
              },
              host_mac: {
                terms: { field: 'host.mac', size: 10, order: { timestamp: 'desc' } },
                aggs: { timestamp: { max: { field: '@timestamp' } } },
              },
              host_name: {
                terms: { field: 'host.name', size: 10, order: { timestamp: 'desc' } },
                aggs: { timestamp: { max: { field: '@timestamp' } } },
              },
              host_os_family: {
                terms: { field: 'host.os.family', size: 10, order: { timestamp: 'desc' } },
                aggs: { timestamp: { max: { field: '@timestamp' } } },
              },
              host_os_name: {
                terms: { field: 'host.os.name', size: 10, order: { timestamp: 'desc' } },
                aggs: { timestamp: { max: { field: '@timestamp' } } },
              },
              host_os_platform: {
                terms: { field: 'host.os.platform', size: 10, order: { timestamp: 'desc' } },
                aggs: { timestamp: { max: { field: '@timestamp' } } },
              },
              host_os_version: {
                terms: { field: 'host.os.version', size: 10, order: { timestamp: 'desc' } },
                aggs: { timestamp: { max: { field: '@timestamp' } } },
              },
              cloud_instance_id: {
                terms: { field: 'cloud.instance.id', size: 10, order: { timestamp: 'desc' } },
                aggs: { timestamp: { max: { field: '@timestamp' } } },
              },
              cloud_machine_type: {
                terms: { field: 'cloud.machine.type', size: 10, order: { timestamp: 'desc' } },
                aggs: { timestamp: { max: { field: '@timestamp' } } },
              },
              cloud_provider: {
                terms: { field: 'cloud.provider', size: 10, order: { timestamp: 'desc' } },
                aggs: { timestamp: { max: { field: '@timestamp' } } },
              },
              cloud_region: {
                terms: { field: 'cloud.region', size: 10, order: { timestamp: 'desc' } },
                aggs: { timestamp: { max: { field: '@timestamp' } } },
              },
              endpoint_id: {
                filter: {
                  term: {
                    'agent.type': 'endpoint',
                  },
                },
                aggs: {
                  value: {
                    terms: {
                      field: 'agent.id',
                    },
                  },
                },
              },
            },
            query: {
              bool: {
                filter: [
                  { term: { 'host.name': 'bastion00.siem.estc.dev' } },
                  {
                    range: {
                      '@timestamp': {
                        format: 'strict_date_optional_time',
                        gte: '2020-09-02T15:17:13.678Z',
                        lte: '2020-09-03T15:17:13.678Z',
                      },
                    },
                  },
                ],
              },
            },
            _source: false,
            fields: [
              'host.architecture',
              'host.id',
              'host.ip',
              'host.mac',
              'host.name',
              'host.os.family',
              'host.os.name',
              'host.os.platform',
              'host.os.version',
              'cloud.instance.id',
              'cloud.machine.type',
              'cloud.provider',
              'cloud.region',
              'agent.type',
              'agent.id',
              {
                field: '@timestamp',
                format: 'strict_date_optional_time',
              },
            ],
            size: 0,
          },
        },
        null,
        2
      ),
    ],
  },
  hostDetails: {},
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
  track_total_hits: false,
  body: {
    aggregations: {
      endpoint_id: {
        filter: {
          term: {
            'agent.type': 'endpoint',
          },
        },
        aggs: {
          value: {
            terms: {
              field: 'agent.id',
            },
          },
        },
      },
      host_architecture: {
        terms: {
          field: 'host.architecture',
          size: 10,
          order: {
            timestamp: 'desc',
          },
        },
        aggs: {
          timestamp: {
            max: {
              field: '@timestamp',
            },
          },
        },
      },
      host_id: {
        terms: {
          field: 'host.id',
          size: 10,
          order: {
            timestamp: 'desc',
          },
        },
        aggs: {
          timestamp: {
            max: {
              field: '@timestamp',
            },
          },
        },
      },
      host_ip: {
        terms: {
          script: {
            source: "doc['host.ip']",
            lang: 'painless',
          },
          size: 10,
          order: {
            timestamp: 'desc',
          },
        },
        aggs: {
          timestamp: {
            max: {
              field: '@timestamp',
            },
          },
        },
      },
      host_mac: {
        terms: {
          field: 'host.mac',
          size: 10,
          order: {
            timestamp: 'desc',
          },
        },
        aggs: {
          timestamp: {
            max: {
              field: '@timestamp',
            },
          },
        },
      },
      host_name: {
        terms: {
          field: 'host.name',
          size: 10,
          order: {
            timestamp: 'desc',
          },
        },
        aggs: {
          timestamp: {
            max: {
              field: '@timestamp',
            },
          },
        },
      },
      host_os_family: {
        terms: {
          field: 'host.os.family',
          size: 10,
          order: {
            timestamp: 'desc',
          },
        },
        aggs: {
          timestamp: {
            max: {
              field: '@timestamp',
            },
          },
        },
      },
      host_os_name: {
        terms: {
          field: 'host.os.name',
          size: 10,
          order: {
            timestamp: 'desc',
          },
        },
        aggs: {
          timestamp: {
            max: {
              field: '@timestamp',
            },
          },
        },
      },
      host_os_platform: {
        terms: {
          field: 'host.os.platform',
          size: 10,
          order: {
            timestamp: 'desc',
          },
        },
        aggs: {
          timestamp: {
            max: {
              field: '@timestamp',
            },
          },
        },
      },
      host_os_version: {
        terms: {
          field: 'host.os.version',
          size: 10,
          order: {
            timestamp: 'desc',
          },
        },
        aggs: {
          timestamp: {
            max: {
              field: '@timestamp',
            },
          },
        },
      },
      cloud_instance_id: {
        terms: {
          field: 'cloud.instance.id',
          size: 10,
          order: {
            timestamp: 'desc',
          },
        },
        aggs: {
          timestamp: {
            max: {
              field: '@timestamp',
            },
          },
        },
      },
      cloud_machine_type: {
        terms: {
          field: 'cloud.machine.type',
          size: 10,
          order: {
            timestamp: 'desc',
          },
        },
        aggs: {
          timestamp: {
            max: {
              field: '@timestamp',
            },
          },
        },
      },
      cloud_provider: {
        terms: {
          field: 'cloud.provider',
          size: 10,
          order: {
            timestamp: 'desc',
          },
        },
        aggs: {
          timestamp: {
            max: {
              field: '@timestamp',
            },
          },
        },
      },
      cloud_region: {
        terms: {
          field: 'cloud.region',
          size: 10,
          order: {
            timestamp: 'desc',
          },
        },
        aggs: {
          timestamp: {
            max: {
              field: '@timestamp',
            },
          },
        },
      },
    },
    query: {
      bool: {
        filter: [
          {
            term: {
              'host.name': 'bastion00.siem.estc.dev',
            },
          },
          {
            range: {
              '@timestamp': {
                format: 'strict_date_optional_time',
                gte: '2020-09-02T15:17:13.678Z',
                lte: '2020-09-03T15:17:13.678Z',
              },
            },
          },
        ],
      },
    },
    _source: false,
    fields: [
      'host.architecture',
      'host.id',
      'host.ip',
      'host.mac',
      'host.name',
      'host.os.family',
      'host.os.name',
      'host.os.platform',
      'host.os.version',
      'cloud.instance.id',
      'cloud.machine.type',
      'cloud.provider',
      'cloud.region',
      'agent.type',
      'agent.id',
      {
        field: '@timestamp',
        format: 'strict_date_optional_time',
      },
    ],
    size: 0,
  },
};
