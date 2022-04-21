/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IEsSearchResponse } from '@kbn/data-plugin/common';

import {
  Direction,
  NetworkDnsFields,
  NetworkHttpRequestOptions,
  NetworkQueries,
  SortField,
} from '../../../../../../../common/search_strategy';

export const mockOptions: NetworkHttpRequestOptions = {
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
  factoryQueryType: NetworkQueries.http,
  filterQuery: '{"bool":{"must":[],"filter":[{"match_all":{}}],"should":[],"must_not":[]}}',
  pagination: { activePage: 0, cursorStart: 0, fakePossibleCount: 50, querySize: 10 },
  sort: { direction: Direction.desc } as SortField<NetworkDnsFields>,
  timerange: { interval: '12h', from: '2020-09-13T09:00:43.249Z', to: '2020-09-14T09:00:43.249Z' },
} as NetworkHttpRequestOptions;

export const mockSearchStrategyResponse: IEsSearchResponse<unknown> = {
  isPartial: false,
  isRunning: false,
  rawResponse: {
    took: 422,
    timed_out: false,
    _shards: { total: 21, successful: 21, skipped: 0, failed: 0 },
    hits: { max_score: 0, hits: [], total: 0 },
    aggregations: {
      http_count: { value: 1404 },
      url: {
        doc_count_error_upper_bound: 1440,
        sum_other_doc_count: 98077,
        buckets: [
          {
            key: '/_nodes?filter_path=nodes.*.version%2Cnodes.*.http.publish_address%2Cnodes.*.ip',
            doc_count: 106704,
            methods: {
              doc_count_error_upper_bound: 0,
              sum_other_doc_count: 0,
              buckets: [{ key: 'GET', doc_count: 106704 }],
            },
            domains: {
              doc_count_error_upper_bound: 0,
              sum_other_doc_count: 0,
              buckets: [
                { key: 'es.siem.estc.dev:9200', doc_count: 68983 },
                { key: 'es.siem.estc.dev', doc_count: 37721 },
              ],
            },
            source: {
              hits: {
                total: { value: 106704, relation: 'eq' },
                max_score: 0,
                hits: [
                  {
                    _index: 'filebeat-8.0.0-2020.09.02-000001',
                    _id: 'L4wXh3QBc39KFIJbgXrN',
                    _score: 0,
                    _source: {
                      host: { name: 'bastion00.siem.estc.dev' },
                      source: { ip: '67.173.227.94' },
                    },
                  },
                ],
              },
            },
            status: {
              doc_count_error_upper_bound: 0,
              sum_other_doc_count: 0,
              buckets: [
                { key: 200, doc_count: 72174 },
                { key: 401, doc_count: 34530 },
              ],
            },
          },
          {
            key: '/_bulk',
            doc_count: 76744,
            methods: {
              doc_count_error_upper_bound: 0,
              sum_other_doc_count: 0,
              buckets: [{ key: 'POST', doc_count: 76744 }],
            },
            domains: {
              doc_count_error_upper_bound: 0,
              sum_other_doc_count: 0,
              buckets: [
                { key: 'es.siem.estc.dev:9200', doc_count: 76737 },
                { key: 'es.siem.estc.dev', doc_count: 7 },
              ],
            },
            source: {
              hits: {
                total: { value: 76744, relation: 'eq' },
                max_score: 0,
                hits: [
                  {
                    _index: 'filebeat-8.0.0-2020.09.02-000001',
                    _id: 'tEIXh3QBB-gskclyiT2g',
                    _score: 0,
                    _source: {
                      host: { name: 'bastion00.siem.estc.dev' },
                      source: { ip: '35.227.65.114' },
                    },
                  },
                ],
              },
            },
            status: {
              doc_count_error_upper_bound: 0,
              sum_other_doc_count: 0,
              buckets: [
                { key: 200, doc_count: 75394 },
                { key: 401, doc_count: 1350 },
              ],
            },
          },
          {
            key: '/.reporting-*/_search',
            doc_count: 58746,
            methods: {
              doc_count_error_upper_bound: 0,
              sum_other_doc_count: 0,
              buckets: [{ key: 'POST', doc_count: 58746 }],
            },
            domains: {
              doc_count_error_upper_bound: 0,
              sum_other_doc_count: 0,
              buckets: [
                { key: 'es.siem.estc.dev:9200', doc_count: 56305 },
                { key: 'es.siem.estc.dev', doc_count: 2441 },
              ],
            },
            source: {
              hits: {
                total: { value: 58746, relation: 'eq' },
                max_score: 0,
                hits: [
                  {
                    _index: 'filebeat-8.0.0-2020.09.02-000001',
                    _id: 'MYwXh3QBc39KFIJbgXrN',
                    _score: 0,
                    _source: {
                      host: { name: 'bastion00.siem.estc.dev' },
                      source: { ip: '67.173.227.94' },
                    },
                  },
                ],
              },
            },
            status: {
              doc_count_error_upper_bound: 0,
              sum_other_doc_count: 0,
              buckets: [{ key: 200, doc_count: 58746 }],
            },
          },
          {
            key: '/.kibana-task-manager-xavier-m/_update_by_query?ignore_unavailable=true&refresh=true&max_docs=10&conflicts=proceed',
            doc_count: 28715,
            methods: {
              doc_count_error_upper_bound: 0,
              sum_other_doc_count: 0,
              buckets: [{ key: 'POST', doc_count: 28715 }],
            },
            domains: {
              doc_count_error_upper_bound: 0,
              sum_other_doc_count: 0,
              buckets: [{ key: 'es.siem.estc.dev:9200', doc_count: 28715 }],
            },
            source: {
              hits: {
                total: { value: 28715, relation: 'eq' },
                max_score: 0,
                hits: [
                  {
                    _index: 'filebeat-8.0.0-2020.09.02-000001',
                    _id: 'MIwXh3QBc39KFIJbgXrN',
                    _score: 0,
                    _source: {
                      host: { name: 'bastion00.siem.estc.dev' },
                      source: { ip: '24.168.52.229' },
                    },
                  },
                ],
              },
            },
            status: {
              doc_count_error_upper_bound: 0,
              sum_other_doc_count: 0,
              buckets: [{ key: 200, doc_count: 28715 }],
            },
          },
          {
            key: '/.kibana-task-manager-andrewg-local-testing-7-9-ff/_update_by_query?ignore_unavailable=true&refresh=true&max_docs=10&conflicts=proceed',
            doc_count: 28161,
            methods: {
              doc_count_error_upper_bound: 0,
              sum_other_doc_count: 0,
              buckets: [{ key: 'POST', doc_count: 28161 }],
            },
            domains: {
              doc_count_error_upper_bound: 0,
              sum_other_doc_count: 0,
              buckets: [{ key: 'es.siem.estc.dev:9200', doc_count: 28161 }],
            },
            source: {
              hits: {
                total: { value: 28161, relation: 'eq' },
                max_score: 0,
                hits: [
                  {
                    _index: 'filebeat-8.0.0-2020.09.02-000001',
                    _id: 'MowXh3QBc39KFIJbgXrN',
                    _score: 0,
                    _source: {
                      host: { name: 'bastion00.siem.estc.dev' },
                      source: { ip: '67.173.227.94' },
                    },
                  },
                ],
              },
            },
            status: {
              doc_count_error_upper_bound: 0,
              sum_other_doc_count: 0,
              buckets: [{ key: 200, doc_count: 28161 }],
            },
          },
          {
            key: '/_security/user/_has_privileges',
            doc_count: 23283,
            methods: {
              doc_count_error_upper_bound: 0,
              sum_other_doc_count: 0,
              buckets: [{ key: 'POST', doc_count: 23283 }],
            },
            domains: {
              doc_count_error_upper_bound: 0,
              sum_other_doc_count: 0,
              buckets: [
                { key: 'es.siem.estc.dev:9200', doc_count: 21601 },
                { key: 'es.siem.estc.dev', doc_count: 1682 },
              ],
            },
            source: {
              hits: {
                total: { value: 23283, relation: 'eq' },
                max_score: 0,
                hits: [
                  {
                    _index: 'filebeat-8.0.0-2020.09.02-000001',
                    _id: '6Ywch3QBc39KFIJbVY_k',
                    _score: 0,
                    _source: {
                      host: { name: 'bastion00.siem.estc.dev' },
                      source: { ip: '67.173.227.94' },
                    },
                  },
                ],
              },
            },
            status: {
              doc_count_error_upper_bound: 0,
              sum_other_doc_count: 0,
              buckets: [{ key: 200, doc_count: 23283 }],
            },
          },
          {
            key: '/_xpack',
            doc_count: 20724,
            methods: {
              doc_count_error_upper_bound: 0,
              sum_other_doc_count: 0,
              buckets: [{ key: 'GET', doc_count: 20724 }],
            },
            domains: {
              doc_count_error_upper_bound: 0,
              sum_other_doc_count: 0,
              buckets: [
                { key: 'es.siem.estc.dev:9200', doc_count: 17289 },
                { key: 'es.siem.estc.dev', doc_count: 3435 },
              ],
            },
            source: {
              hits: {
                total: { value: 20724, relation: 'eq' },
                max_score: 0,
                hits: [
                  {
                    _index: 'filebeat-8.0.0-2020.09.02-000001',
                    _id: 'rkIXh3QBB-gskclyiT2g',
                    _score: 0,
                    _source: {
                      host: { name: 'bastion00.siem.estc.dev' },
                      source: { ip: '35.226.77.71' },
                    },
                  },
                ],
              },
            },
            status: {
              doc_count_error_upper_bound: 0,
              sum_other_doc_count: 0,
              buckets: [
                { key: 200, doc_count: 12084 },
                { key: 401, doc_count: 8640 },
              ],
            },
          },
          {
            key: '/',
            doc_count: 18306,
            methods: {
              doc_count_error_upper_bound: 0,
              sum_other_doc_count: 0,
              buckets: [
                { key: 'GET', doc_count: 18274 },
                { key: 'HEAD', doc_count: 29 },
                { key: 'POST', doc_count: 3 },
              ],
            },
            domains: {
              doc_count_error_upper_bound: 0,
              sum_other_doc_count: 37,
              buckets: [
                { key: 'es.siem.estc.dev', doc_count: 8631 },
                { key: 'es.siem.estc.dev:9200', doc_count: 5757 },
                { key: 'es.siem.estc.dev:443', doc_count: 3858 },
                { key: '35.232.239.42', doc_count: 20 },
              ],
            },
            source: {
              hits: {
                total: { value: 18306, relation: 'eq' },
                max_score: 0,
                hits: [
                  {
                    _index: 'filebeat-8.0.0-2020.09.02-000001',
                    _id: 'JEIYh3QBB-gskclyYEfA',
                    _score: 0,
                    _source: {
                      host: { name: 'bastion00.siem.estc.dev' },
                      source: { ip: '35.171.72.245' },
                    },
                  },
                ],
              },
            },
            status: {
              doc_count_error_upper_bound: 0,
              sum_other_doc_count: 3,
              buckets: [
                { key: 401, doc_count: 18220 },
                { key: 404, doc_count: 30 },
                { key: 302, doc_count: 27 },
                { key: 200, doc_count: 26 },
              ],
            },
          },
          {
            key: '/_monitoring/bulk?system_id=kibana&system_api_version=7&interval=10000ms',
            doc_count: 18048,
            methods: {
              doc_count_error_upper_bound: 0,
              sum_other_doc_count: 0,
              buckets: [{ key: 'POST', doc_count: 18048 }],
            },
            domains: {
              doc_count_error_upper_bound: 0,
              sum_other_doc_count: 0,
              buckets: [
                { key: 'es.siem.estc.dev:9200', doc_count: 17279 },
                { key: 'es.siem.estc.dev', doc_count: 769 },
              ],
            },
            source: {
              hits: {
                total: { value: 18048, relation: 'eq' },
                max_score: 0,
                hits: [
                  {
                    _index: 'filebeat-8.0.0-2020.09.02-000001',
                    _id: 'sUIXh3QBB-gskclyiT2g',
                    _score: 0,
                    _source: {
                      host: { name: 'bastion00.siem.estc.dev' },
                      source: { ip: '24.168.52.229' },
                    },
                  },
                ],
              },
            },
            status: {
              doc_count_error_upper_bound: 0,
              sum_other_doc_count: 0,
              buckets: [{ key: 200, doc_count: 18048 }],
            },
          },
          {
            key: '/s/row-renderer-checking/api/reporting/jobs/count',
            doc_count: 14046,
            methods: {
              doc_count_error_upper_bound: 0,
              sum_other_doc_count: 0,
              buckets: [{ key: 'GET', doc_count: 14046 }],
            },
            domains: {
              doc_count_error_upper_bound: 0,
              sum_other_doc_count: 0,
              buckets: [{ key: 'kibana.siem.estc.dev', doc_count: 14046 }],
            },
            source: {
              hits: {
                total: { value: 14046, relation: 'eq' },
                max_score: 0,
                hits: [
                  {
                    _index: 'filebeat-8.0.0-2020.09.02-000001',
                    _id: 's0IXh3QBB-gskclyiT2g',
                    _score: 0,
                    _source: {
                      host: { name: 'bastion00.siem.estc.dev' },
                      source: { ip: '75.134.244.183' },
                    },
                  },
                ],
              },
            },
            status: {
              doc_count_error_upper_bound: 0,
              sum_other_doc_count: 0,
              buckets: [{ key: 200, doc_count: 14046 }],
            },
          },
        ],
      },
    },
  },
  total: 21,
  loaded: 21,
};

export const formattedSearchStrategyResponse = {
  ...mockSearchStrategyResponse,
  edges: [
    {
      node: {
        _id: '/_nodes?filter_path=nodes.*.version%2Cnodes.*.http.publish_address%2Cnodes.*.ip',
        domains: ['es.siem.estc.dev:9200', 'es.siem.estc.dev'],
        methods: ['GET'],
        statuses: ['200', '401'],
        lastHost: 'bastion00.siem.estc.dev',
        lastSourceIp: '67.173.227.94',
        path: '/_nodes?filter_path=nodes.*.version%2Cnodes.*.http.publish_address%2Cnodes.*.ip',
        requestCount: 106704,
      },
      cursor: {
        value: '/_nodes?filter_path=nodes.*.version%2Cnodes.*.http.publish_address%2Cnodes.*.ip',
        tiebreaker: null,
      },
    },
    {
      node: {
        _id: '/_bulk',
        domains: ['es.siem.estc.dev:9200', 'es.siem.estc.dev'],
        methods: ['POST'],
        statuses: ['200', '401'],
        lastHost: 'bastion00.siem.estc.dev',
        lastSourceIp: '35.227.65.114',
        path: '/_bulk',
        requestCount: 76744,
      },
      cursor: { value: '/_bulk', tiebreaker: null },
    },
    {
      node: {
        _id: '/.reporting-*/_search',
        domains: ['es.siem.estc.dev:9200', 'es.siem.estc.dev'],
        methods: ['POST'],
        statuses: ['200'],
        lastHost: 'bastion00.siem.estc.dev',
        lastSourceIp: '67.173.227.94',
        path: '/.reporting-*/_search',
        requestCount: 58746,
      },
      cursor: { value: '/.reporting-*/_search', tiebreaker: null },
    },
    {
      node: {
        _id: '/.kibana-task-manager-xavier-m/_update_by_query?ignore_unavailable=true&refresh=true&max_docs=10&conflicts=proceed',
        domains: ['es.siem.estc.dev:9200'],
        methods: ['POST'],
        statuses: ['200'],
        lastHost: 'bastion00.siem.estc.dev',
        lastSourceIp: '24.168.52.229',
        path: '/.kibana-task-manager-xavier-m/_update_by_query?ignore_unavailable=true&refresh=true&max_docs=10&conflicts=proceed',
        requestCount: 28715,
      },
      cursor: {
        value:
          '/.kibana-task-manager-xavier-m/_update_by_query?ignore_unavailable=true&refresh=true&max_docs=10&conflicts=proceed',
        tiebreaker: null,
      },
    },
    {
      node: {
        _id: '/.kibana-task-manager-andrewg-local-testing-7-9-ff/_update_by_query?ignore_unavailable=true&refresh=true&max_docs=10&conflicts=proceed',
        domains: ['es.siem.estc.dev:9200'],
        methods: ['POST'],
        statuses: ['200'],
        lastHost: 'bastion00.siem.estc.dev',
        lastSourceIp: '67.173.227.94',
        path: '/.kibana-task-manager-andrewg-local-testing-7-9-ff/_update_by_query?ignore_unavailable=true&refresh=true&max_docs=10&conflicts=proceed',
        requestCount: 28161,
      },
      cursor: {
        value:
          '/.kibana-task-manager-andrewg-local-testing-7-9-ff/_update_by_query?ignore_unavailable=true&refresh=true&max_docs=10&conflicts=proceed',
        tiebreaker: null,
      },
    },
    {
      node: {
        _id: '/_security/user/_has_privileges',
        domains: ['es.siem.estc.dev:9200', 'es.siem.estc.dev'],
        methods: ['POST'],
        statuses: ['200'],
        lastHost: 'bastion00.siem.estc.dev',
        lastSourceIp: '67.173.227.94',
        path: '/_security/user/_has_privileges',
        requestCount: 23283,
      },
      cursor: { value: '/_security/user/_has_privileges', tiebreaker: null },
    },
    {
      node: {
        _id: '/_xpack',
        domains: ['es.siem.estc.dev:9200', 'es.siem.estc.dev'],
        methods: ['GET'],
        statuses: ['200', '401'],
        lastHost: 'bastion00.siem.estc.dev',
        lastSourceIp: '35.226.77.71',
        path: '/_xpack',
        requestCount: 20724,
      },
      cursor: { value: '/_xpack', tiebreaker: null },
    },
    {
      node: {
        _id: '/',
        domains: [
          'es.siem.estc.dev',
          'es.siem.estc.dev:9200',
          'es.siem.estc.dev:443',
          '35.232.239.42',
        ],
        methods: ['GET', 'HEAD', 'POST'],
        statuses: ['401', '404', '302', '200'],
        lastHost: 'bastion00.siem.estc.dev',
        lastSourceIp: '35.171.72.245',
        path: '/',
        requestCount: 18306,
      },
      cursor: { value: '/', tiebreaker: null },
    },
    {
      node: {
        _id: '/_monitoring/bulk?system_id=kibana&system_api_version=7&interval=10000ms',
        domains: ['es.siem.estc.dev:9200', 'es.siem.estc.dev'],
        methods: ['POST'],
        statuses: ['200'],
        lastHost: 'bastion00.siem.estc.dev',
        lastSourceIp: '24.168.52.229',
        path: '/_monitoring/bulk?system_id=kibana&system_api_version=7&interval=10000ms',
        requestCount: 18048,
      },
      cursor: {
        value: '/_monitoring/bulk?system_id=kibana&system_api_version=7&interval=10000ms',
        tiebreaker: null,
      },
    },
    {
      node: {
        _id: '/s/row-renderer-checking/api/reporting/jobs/count',
        domains: ['kibana.siem.estc.dev'],
        methods: ['GET'],
        statuses: ['200'],
        lastHost: 'bastion00.siem.estc.dev',
        lastSourceIp: '75.134.244.183',
        path: '/s/row-renderer-checking/api/reporting/jobs/count',
        requestCount: 14046,
      },
      cursor: { value: '/s/row-renderer-checking/api/reporting/jobs/count', tiebreaker: null },
    },
  ],
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
              http_count: { cardinality: { field: 'url.path' } },
              url: {
                terms: { field: 'url.path', size: 10, order: { _count: 'desc' } },
                aggs: {
                  methods: { terms: { field: 'http.request.method', size: 4 } },
                  domains: { terms: { field: 'url.domain', size: 4 } },
                  status: { terms: { field: 'http.response.status_code', size: 4 } },
                  source: {
                    top_hits: { size: 1, _source: { includes: ['host.name', 'source.ip'] } },
                  },
                },
              },
            },
            query: {
              bool: {
                filter: [
                  { bool: { must: [], filter: [{ match_all: {} }], should: [], must_not: [] } },
                  {
                    range: {
                      '@timestamp': {
                        gte: '2020-09-13T09:00:43.249Z',
                        lte: '2020-09-14T09:00:43.249Z',
                        format: 'strict_date_optional_time',
                      },
                    },
                  },
                  { exists: { field: 'http.request.method' } },
                ],
              },
            },
          },
          size: 0,
          track_total_hits: false,
        },
        null,
        2
      ),
    ],
  },
  pageInfo: { activePage: 0, fakeTotalCount: 50, showMorePagesIndicator: true },
  totalCount: 1404,
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
      http_count: { cardinality: { field: 'url.path' } },
      url: {
        terms: { field: 'url.path', size: 10, order: { _count: 'desc' } },
        aggs: {
          methods: { terms: { field: 'http.request.method', size: 4 } },
          domains: { terms: { field: 'url.domain', size: 4 } },
          status: { terms: { field: 'http.response.status_code', size: 4 } },
          source: { top_hits: { size: 1, _source: { includes: ['host.name', 'source.ip'] } } },
        },
      },
    },
    query: {
      bool: {
        filter: [
          { bool: { must: [], filter: [{ match_all: {} }], should: [], must_not: [] } },
          {
            range: {
              '@timestamp': {
                gte: '2020-09-13T09:00:43.249Z',
                lte: '2020-09-14T09:00:43.249Z',
                format: 'strict_date_optional_time',
              },
            },
          },
          { exists: { field: 'http.request.method' } },
        ],
      },
    },
  },
  size: 0,
  track_total_hits: false,
};
