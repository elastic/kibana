/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IEsSearchResponse } from '../../../../../../../../../../src/plugins/data/common';

import {
  Direction,
  FlowTargetSourceDest,
  NetworkQueries,
  NetworkTopNFlowRequestOptions,
  NetworkTopNFlowStrategyResponse,
  NetworkTopTablesFields,
} from '../../../../../../../common/search_strategy';

export const mockOptions: NetworkTopNFlowRequestOptions = {
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
  factoryQueryType: NetworkQueries.topNFlow,
  filterQuery: '{"bool":{"must":[],"filter":[{"match_all":{}}],"should":[],"must_not":[]}}',
  flowTarget: FlowTargetSourceDest.source,
  pagination: { activePage: 0, cursorStart: 0, fakePossibleCount: 50, querySize: 10 },
  sort: { field: NetworkTopTablesFields.bytes_out, direction: Direction.desc },
  timerange: { interval: '12h', from: '2020-09-13T10:16:46.870Z', to: '2020-09-14T10:16:46.870Z' },
};

export const mockSearchStrategyResponse: IEsSearchResponse<unknown> = {
  isPartial: false,
  isRunning: false,
  rawResponse: {
    took: 191,
    timed_out: false,
    _shards: { total: 21, successful: 21, skipped: 0, failed: 0 },
    hits: { max_score: 0, hits: [], total: 0 },
    aggregations: {
      source: {
        meta: {},
        doc_count_error_upper_bound: -1,
        sum_other_doc_count: 500330,
        buckets: [
          {
            key: '10.142.0.7',
            doc_count: 12116,
            bytes_out: { value: 2581835370 },
            flows: { value: 1967 },
            bytes_in: { value: 0 },
            domain: {
              doc_count_error_upper_bound: 0,
              sum_other_doc_count: 0,
              buckets: [
                {
                  key: 'siem-kibana',
                  doc_count: 3221,
                  timestamp: { value: 1600078221017, value_as_string: '2020-09-14T10:10:21.017Z' },
                },
              ],
            },
            autonomous_system: {
              meta: {},
              doc_count: 0,
              top_as: { hits: { total: { value: 0, relation: 'eq' }, max_score: 0, hits: [] } },
            },
            location: {
              doc_count: 0,
              top_geo: { hits: { total: { value: 0, relation: 'eq' }, max_score: 0, hits: [] } },
            },
            destination_ips: { value: 264 },
          },
          {
            key: '35.232.239.42',
            doc_count: 2119,
            bytes_out: { value: 86968388 },
            flows: { value: 922 },
            bytes_in: { value: 0 },
            domain: { doc_count_error_upper_bound: 0, sum_other_doc_count: 0, buckets: [] },
            autonomous_system: {
              doc_count: 2119,
              top_as: {
                hits: {
                  total: { value: 2119, relation: 'eq' },
                  max_score: 0,
                  hits: [
                    {
                      _index: 'filebeat-8.0.0-2020.09.02-000001',
                      _id: 'dd4fa2d4bd-1526378075029582',
                      _score: 0,
                      _source: {
                        source: { as: { number: 15169, organization: { name: 'Google LLC' } } },
                      },
                    },
                  ],
                },
              },
            },
            location: {
              doc_count: 2119,
              top_geo: {
                hits: {
                  total: { value: 2119, relation: 'eq' },
                  max_score: 0,
                  hits: [
                    {
                      _index: 'filebeat-8.0.0-2020.09.02-000001',
                      _id: 'dd4fa2d4bd-1526378075029582',
                      _score: 0,
                      _source: {
                        source: {
                          geo: {
                            continent_name: 'North America',
                            region_iso_code: 'US-VA',
                            country_iso_code: 'US',
                            region_name: 'Virginia',
                            location: { lon: -77.2481, lat: 38.6583 },
                          },
                        },
                      },
                    },
                  ],
                },
              },
            },
            destination_ips: { value: 1 },
          },
          {
            key: '151.101.200.204',
            doc_count: 2,
            bytes_out: { value: 1394839 },
            flows: { value: 2 },
            bytes_in: { value: 0 },
            domain: { doc_count_error_upper_bound: 0, sum_other_doc_count: 0, buckets: [] },
            autonomous_system: {
              doc_count: 2,
              top_as: {
                hits: {
                  total: { value: 2, relation: 'eq' },
                  max_score: 0,
                  hits: [
                    {
                      _index: 'filebeat-8.0.0-2020.09.02-000001',
                      _id: 'dd4fa2d4bd-1527252060367158',
                      _score: 0,
                      _source: {
                        source: { as: { number: 54113, organization: { name: 'Fastly' } } },
                      },
                    },
                  ],
                },
              },
            },
            location: {
              doc_count: 2,
              top_geo: {
                hits: {
                  total: { value: 2, relation: 'eq' },
                  max_score: 0,
                  hits: [
                    {
                      _index: 'filebeat-8.0.0-2020.09.02-000001',
                      _id: 'dd4fa2d4bd-1527252060367158',
                      _score: 0,
                      _source: {
                        source: {
                          geo: {
                            continent_name: 'North America',
                            region_iso_code: 'US-VA',
                            city_name: 'Ashburn',
                            country_iso_code: 'US',
                            region_name: 'Virginia',
                            location: { lon: -77.4728, lat: 39.0481 },
                          },
                        },
                      },
                    },
                  ],
                },
              },
            },
            destination_ips: { value: 1 },
          },
          {
            key: '91.189.92.39',
            doc_count: 1,
            bytes_out: { value: 570550 },
            flows: { value: 1 },
            bytes_in: { value: 0 },
            domain: { doc_count_error_upper_bound: 0, sum_other_doc_count: 0, buckets: [] },
            autonomous_system: {
              doc_count: 1,
              top_as: {
                hits: {
                  total: { value: 1, relation: 'eq' },
                  max_score: 0,
                  hits: [
                    {
                      _index: 'filebeat-8.0.0-2020.09.02-000001',
                      _id: 'dd4fa2d4bd-1526971840437636',
                      _score: 0,
                      _source: {
                        source: {
                          as: { number: 41231, organization: { name: 'Canonical Group Limited' } },
                        },
                      },
                    },
                  ],
                },
              },
            },
            location: {
              doc_count: 1,
              top_geo: {
                hits: {
                  total: { value: 1, relation: 'eq' },
                  max_score: 0,
                  hits: [
                    {
                      _index: 'filebeat-8.0.0-2020.09.02-000001',
                      _id: 'dd4fa2d4bd-1526971840437636',
                      _score: 0,
                      _source: {
                        source: {
                          geo: {
                            continent_name: 'Europe',
                            region_iso_code: 'GB-ENG',
                            city_name: 'London',
                            country_iso_code: 'GB',
                            region_name: 'England',
                            location: { lon: -0.0961, lat: 51.5132 },
                          },
                        },
                      },
                    },
                  ],
                },
              },
            },
            destination_ips: { value: 1 },
          },
          {
            key: '10.142.0.5',
            doc_count: 514,
            bytes_out: { value: 565933 },
            flows: { value: 486 },
            bytes_in: { value: 0 },
            domain: {
              doc_count_error_upper_bound: 0,
              sum_other_doc_count: 0,
              buckets: [
                {
                  key: 'infraops-docker-data',
                  doc_count: 514,
                  timestamp: { value: 1600078218215, value_as_string: '2020-09-14T10:10:18.215Z' },
                },
              ],
            },
            autonomous_system: {
              doc_count: 0,
              top_as: { hits: { total: { value: 0, relation: 'eq' }, max_score: 0, hits: [] } },
            },
            location: {
              doc_count: 0,
              top_geo: { hits: { total: { value: 0, relation: 'eq' }, max_score: 0, hits: [] } },
            },
            destination_ips: { value: 343 },
          },
          {
            key: '151.101.248.204',
            doc_count: 6,
            bytes_out: { value: 260903 },
            flows: { value: 6 },
            bytes_in: { value: 0 },
            domain: { doc_count_error_upper_bound: 0, sum_other_doc_count: 0, buckets: [] },
            autonomous_system: {
              doc_count: 6,
              top_as: {
                hits: {
                  total: { value: 6, relation: 'eq' },
                  max_score: 0,
                  hits: [
                    {
                      _index: 'filebeat-8.0.0-2020.09.02-000001',
                      _id: 'dd4fa2d4bd-1527003062069535',
                      _score: 0,
                      _source: {
                        source: { as: { number: 54113, organization: { name: 'Fastly' } } },
                      },
                    },
                  ],
                },
              },
            },
            location: {
              doc_count: 6,
              top_geo: {
                hits: {
                  total: { value: 6, relation: 'eq' },
                  max_score: 0,
                  hits: [
                    {
                      _index: 'filebeat-8.0.0-2020.09.02-000001',
                      _id: 'dd4fa2d4bd-1527003062069535',
                      _score: 0,
                      _source: {
                        source: {
                          geo: {
                            continent_name: 'North America',
                            region_iso_code: 'US-VA',
                            city_name: 'Ashburn',
                            country_iso_code: 'US',
                            region_name: 'Virginia',
                            location: { lon: -77.539, lat: 39.018 },
                          },
                        },
                      },
                    },
                  ],
                },
              },
            },
            destination_ips: { value: 1 },
          },
          {
            key: '35.196.129.83',
            doc_count: 1,
            bytes_out: { value: 164079 },
            flows: { value: 1 },
            bytes_in: { value: 0 },
            domain: { doc_count_error_upper_bound: 0, sum_other_doc_count: 0, buckets: [] },
            autonomous_system: {
              doc_count: 1,
              top_as: {
                hits: {
                  total: { value: 1, relation: 'eq' },
                  max_score: 0,
                  hits: [
                    {
                      _index: 'filebeat-8.0.0-2020.09.02-000001',
                      _id: 'dd4fa2d4bd-1526557113311472',
                      _score: 0,
                      _source: {
                        source: { as: { number: 15169, organization: { name: 'Google LLC' } } },
                      },
                    },
                  ],
                },
              },
            },
            location: {
              doc_count: 1,
              top_geo: {
                hits: {
                  total: { value: 1, relation: 'eq' },
                  max_score: 0,
                  hits: [
                    {
                      _index: 'filebeat-8.0.0-2020.09.02-000001',
                      _id: 'dd4fa2d4bd-1526557113311472',
                      _score: 0,
                      _source: {
                        source: {
                          geo: {
                            continent_name: 'North America',
                            region_iso_code: 'US-VA',
                            country_iso_code: 'US',
                            region_name: 'Virginia',
                            location: { lon: -77.2481, lat: 38.6583 },
                          },
                        },
                      },
                    },
                  ],
                },
              },
            },
            destination_ips: { value: 1 },
          },
          {
            key: '151.101.2.217',
            doc_count: 24,
            bytes_out: { value: 158407 },
            flows: { value: 24 },
            bytes_in: { value: 0 },
            domain: { doc_count_error_upper_bound: 0, sum_other_doc_count: 0, buckets: [] },
            autonomous_system: {
              doc_count: 24,
              top_as: {
                hits: {
                  total: { value: 24, relation: 'eq' },
                  max_score: 0,
                  hits: [
                    {
                      _index: 'filebeat-8.0.0-2020.09.02-000001',
                      _id: 'dd4fa2d4bd-1526379128390241',
                      _score: 0,
                      _source: {
                        source: { as: { number: 54113, organization: { name: 'Fastly' } } },
                      },
                    },
                  ],
                },
              },
            },
            location: {
              doc_count: 24,
              top_geo: {
                hits: {
                  total: { value: 24, relation: 'eq' },
                  max_score: 0,
                  hits: [
                    {
                      _index: 'filebeat-8.0.0-2020.09.02-000001',
                      _id: 'dd4fa2d4bd-1526379128390241',
                      _score: 0,
                      _source: {
                        source: {
                          geo: {
                            continent_name: 'North America',
                            country_iso_code: 'US',
                            location: { lon: -97.822, lat: 37.751 },
                          },
                        },
                      },
                    },
                  ],
                },
              },
            },
            destination_ips: { value: 1 },
          },
          {
            key: '91.189.91.38',
            doc_count: 1,
            bytes_out: { value: 89031 },
            flows: { value: 1 },
            bytes_in: { value: 0 },
            domain: { doc_count_error_upper_bound: 0, sum_other_doc_count: 0, buckets: [] },
            autonomous_system: {
              doc_count: 1,
              top_as: {
                hits: {
                  total: { value: 1, relation: 'eq' },
                  max_score: 0,
                  hits: [
                    {
                      _index: 'filebeat-8.0.0-2020.09.02-000001',
                      _id: 'dd4fa2d4bd-1526555996515551',
                      _score: 0,
                      _source: {
                        source: {
                          as: { number: 41231, organization: { name: 'Canonical Group Limited' } },
                        },
                      },
                    },
                  ],
                },
              },
            },
            location: {
              doc_count: 1,
              top_geo: {
                hits: {
                  total: { value: 1, relation: 'eq' },
                  max_score: 0,
                  hits: [
                    {
                      _index: 'filebeat-8.0.0-2020.09.02-000001',
                      _id: 'dd4fa2d4bd-1526555996515551',
                      _score: 0,
                      _source: {
                        source: {
                          geo: {
                            continent_name: 'North America',
                            region_iso_code: 'US-MA',
                            city_name: 'Boston',
                            country_iso_code: 'US',
                            region_name: 'Massachusetts',
                            location: { lon: -71.0631, lat: 42.3562 },
                          },
                        },
                      },
                    },
                  ],
                },
              },
            },
            destination_ips: { value: 1 },
          },
          {
            key: '193.228.91.123',
            doc_count: 33,
            bytes_out: { value: 32170 },
            flows: { value: 33 },
            bytes_in: { value: 0 },
            domain: { doc_count_error_upper_bound: 0, sum_other_doc_count: 0, buckets: [] },
            autonomous_system: {
              doc_count: 33,
              top_as: {
                hits: {
                  total: { value: 33, relation: 'eq' },
                  max_score: 0,
                  hits: [
                    {
                      _index: 'filebeat-8.0.0-2020.09.02-000001',
                      _id: 'dd4fa2d4bd-1526584379144248',
                      _score: 0,
                      _source: {
                        source: { as: { number: 133766, organization: { name: 'YHSRV.LLC' } } },
                      },
                    },
                  ],
                },
              },
            },
            location: {
              doc_count: 33,
              top_geo: {
                hits: {
                  total: { value: 33, relation: 'eq' },
                  max_score: 0,
                  hits: [
                    {
                      _index: 'filebeat-8.0.0-2020.09.02-000001',
                      _id: 'dd4fa2d4bd-1526584379144248',
                      _score: 0,
                      _source: {
                        source: {
                          geo: {
                            continent_name: 'North America',
                            country_iso_code: 'US',
                            location: { lon: -97.822, lat: 37.751 },
                          },
                        },
                      },
                    },
                  ],
                },
              },
            },
            destination_ips: { value: 2 },
          },
        ],
      },
      top_n_flow_count: { value: 738 },
    },
  },
  total: 21,
  loaded: 21,
};

export const formattedSearchStrategyResponse: NetworkTopNFlowStrategyResponse = {
  edges: [
    {
      node: {
        _id: '10.142.0.7',
        source: {
          domain: ['siem-kibana'],
          ip: '10.142.0.7',
          location: null,
          autonomous_system: null,
          flows: 1967,
          destination_ips: 264,
        },
        network: { bytes_in: 0, bytes_out: 2581835370 },
      },
      cursor: { value: '10.142.0.7', tiebreaker: null },
    },
    {
      node: {
        _id: '35.232.239.42',
        source: {
          domain: [],
          ip: '35.232.239.42',
          location: {
            geo: {
              continent_name: ['North America'],
              region_iso_code: ['US-VA'],
              country_iso_code: ['US'],
              region_name: ['Virginia'],
              location: {
                lon: [-77.2481],
                lat: [38.6583],
              },
            },
            flowTarget: FlowTargetSourceDest.source,
          },
          autonomous_system: { number: 15169, name: 'Google LLC' },
          flows: 922,
          destination_ips: 1,
        },
        network: { bytes_in: 0, bytes_out: 86968388 },
      },
      cursor: { value: '35.232.239.42', tiebreaker: null },
    },
    {
      node: {
        _id: '151.101.200.204',
        source: {
          domain: [],
          ip: '151.101.200.204',
          location: {
            geo: {
              continent_name: ['North America'],
              region_iso_code: ['US-VA'],
              city_name: ['Ashburn'],
              country_iso_code: ['US'],
              region_name: ['Virginia'],
              location: {
                lon: [-77.4728],
                lat: [39.0481],
              },
            },
            flowTarget: FlowTargetSourceDest.source,
          },
          autonomous_system: { number: 54113, name: 'Fastly' },
          flows: 2,
          destination_ips: 1,
        },
        network: { bytes_in: 0, bytes_out: 1394839 },
      },
      cursor: { value: '151.101.200.204', tiebreaker: null },
    },
    {
      node: {
        _id: '91.189.92.39',
        source: {
          domain: [],
          ip: '91.189.92.39',
          location: {
            geo: {
              continent_name: ['Europe'],
              region_iso_code: ['GB-ENG'],
              city_name: ['London'],
              country_iso_code: ['GB'],
              region_name: ['England'],
              location: {
                lon: [-0.0961],
                lat: [51.5132],
              },
            },
            flowTarget: FlowTargetSourceDest.source,
          },
          autonomous_system: { number: 41231, name: 'Canonical Group Limited' },
          flows: 1,
          destination_ips: 1,
        },
        network: { bytes_in: 0, bytes_out: 570550 },
      },
      cursor: { value: '91.189.92.39', tiebreaker: null },
    },
    {
      node: {
        _id: '10.142.0.5',
        source: {
          domain: ['infraops-docker-data'],
          ip: '10.142.0.5',
          location: null,
          autonomous_system: null,
          flows: 486,
          destination_ips: 343,
        },
        network: { bytes_in: 0, bytes_out: 565933 },
      },
      cursor: { value: '10.142.0.5', tiebreaker: null },
    },
    {
      node: {
        _id: '151.101.248.204',
        source: {
          domain: [],
          ip: '151.101.248.204',
          location: {
            geo: {
              continent_name: ['North America'],
              region_iso_code: ['US-VA'],
              city_name: ['Ashburn'],
              country_iso_code: ['US'],
              region_name: ['Virginia'],
              location: {
                lon: [-77.539],
                lat: [39.018],
              },
            },
            flowTarget: FlowTargetSourceDest.source,
          },
          autonomous_system: { number: 54113, name: 'Fastly' },
          flows: 6,
          destination_ips: 1,
        },
        network: { bytes_in: 0, bytes_out: 260903 },
      },
      cursor: { value: '151.101.248.204', tiebreaker: null },
    },
    {
      node: {
        _id: '35.196.129.83',
        source: {
          domain: [],
          ip: '35.196.129.83',
          location: {
            geo: {
              continent_name: ['North America'],
              region_iso_code: ['US-VA'],
              country_iso_code: ['US'],
              region_name: ['Virginia'],
              location: {
                lon: [-77.2481],
                lat: [38.6583],
              },
            },
            flowTarget: FlowTargetSourceDest.source,
          },
          autonomous_system: { number: 15169, name: 'Google LLC' },
          flows: 1,
          destination_ips: 1,
        },
        network: { bytes_in: 0, bytes_out: 164079 },
      },
      cursor: { value: '35.196.129.83', tiebreaker: null },
    },
    {
      node: {
        _id: '151.101.2.217',
        source: {
          domain: [],
          ip: '151.101.2.217',
          location: {
            geo: {
              continent_name: ['North America'],
              country_iso_code: ['US'],
              location: {
                lon: [-97.822],
                lat: [37.751],
              },
            },
            flowTarget: FlowTargetSourceDest.source,
          },
          autonomous_system: { number: 54113, name: 'Fastly' },
          flows: 24,
          destination_ips: 1,
        },
        network: { bytes_in: 0, bytes_out: 158407 },
      },
      cursor: { value: '151.101.2.217', tiebreaker: null },
    },
    {
      node: {
        _id: '91.189.91.38',
        source: {
          domain: [],
          ip: '91.189.91.38',
          location: {
            geo: {
              continent_name: ['North America'],
              region_iso_code: ['US-MA'],
              city_name: ['Boston'],
              country_iso_code: ['US'],
              region_name: ['Massachusetts'],
              location: {
                lon: [-71.0631],
                lat: [42.3562],
              },
            },
            flowTarget: FlowTargetSourceDest.source,
          },
          autonomous_system: { number: 41231, name: 'Canonical Group Limited' },
          flows: 1,
          destination_ips: 1,
        },
        network: { bytes_in: 0, bytes_out: 89031 },
      },
      cursor: { value: '91.189.91.38', tiebreaker: null },
    },
    {
      node: {
        _id: '193.228.91.123',
        source: {
          domain: [],
          ip: '193.228.91.123',
          location: {
            geo: {
              continent_name: ['North America'],
              country_iso_code: ['US'],
              location: {
                lon: [-97.822],
                lat: [37.751],
              },
            },
            flowTarget: FlowTargetSourceDest.source,
          },
          autonomous_system: { number: 133766, name: 'YHSRV.LLC' },
          flows: 33,
          destination_ips: 2,
        },
        network: { bytes_in: 0, bytes_out: 32170 },
      },
      cursor: { value: '193.228.91.123', tiebreaker: null },
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
              top_n_flow_count: { cardinality: { field: 'source.ip' } },
              source: {
                terms: { field: 'source.ip', size: 10, order: { bytes_out: 'desc' } },
                aggs: {
                  bytes_in: { sum: { field: 'destination.bytes' } },
                  bytes_out: { sum: { field: 'source.bytes' } },
                  domain: {
                    terms: { field: 'source.domain', order: { timestamp: 'desc' } },
                    aggs: { timestamp: { max: { field: '@timestamp' } } },
                  },
                  location: {
                    filter: { exists: { field: 'source.geo' } },
                    aggs: { top_geo: { top_hits: { _source: 'source.geo.*', size: 1 } } },
                  },
                  autonomous_system: {
                    filter: { exists: { field: 'source.as' } },
                    aggs: { top_as: { top_hits: { _source: 'source.as.*', size: 1 } } },
                  },
                  flows: { cardinality: { field: 'network.community_id' } },
                  destination_ips: { cardinality: { field: 'destination.ip' } },
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
                        gte: '2020-09-13T10:16:46.870Z',
                        lte: '2020-09-14T10:16:46.870Z',
                        format: 'strict_date_optional_time',
                      },
                    },
                  },
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
  totalCount: 738,
  rawResponse: {} as NetworkTopNFlowStrategyResponse['rawResponse'],
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
      top_n_flow_count: { cardinality: { field: 'source.ip' } },
      source: {
        terms: { field: 'source.ip', size: 10, order: { bytes_out: 'desc' } },
        aggs: {
          bytes_in: { sum: { field: 'destination.bytes' } },
          bytes_out: { sum: { field: 'source.bytes' } },
          domain: {
            terms: { field: 'source.domain', order: { timestamp: 'desc' } },
            aggs: { timestamp: { max: { field: '@timestamp' } } },
          },
          location: {
            filter: { exists: { field: 'source.geo' } },
            aggs: { top_geo: { top_hits: { _source: 'source.geo.*', size: 1 } } },
          },
          autonomous_system: {
            filter: { exists: { field: 'source.as' } },
            aggs: { top_as: { top_hits: { _source: 'source.as.*', size: 1 } } },
          },
          flows: { cardinality: { field: 'network.community_id' } },
          destination_ips: { cardinality: { field: 'destination.ip' } },
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
                gte: '2020-09-13T10:16:46.870Z',
                lte: '2020-09-14T10:16:46.870Z',
                format: 'strict_date_optional_time',
              },
            },
          },
        ],
      },
    },
  },
  size: 0,
  track_total_hits: false,
};
