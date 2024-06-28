/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IEsSearchResponse } from '@kbn/search-types';
import type { NetworkDetailsRequestOptions } from '../../../../../../../common/api/search_strategy';

import { NetworkQueries } from '../../../../../../../common/search_strategy';

export const mockOptions: NetworkDetailsRequestOptions = {
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
  factoryQueryType: NetworkQueries.details,
  filterQuery: '{"bool":{"must":[],"filter":[{"match_all":{}}],"should":[],"must_not":[]}}',
  ip: '35.196.65.164',
};

export const mockSearchStrategyResponse: IEsSearchResponse<unknown> = {
  isPartial: false,
  isRunning: false,
  rawResponse: {
    took: 2620,
    timed_out: false,
    _shards: { total: 21, successful: 21, skipped: 0, failed: 0 },
    hits: { total: 0, max_score: 0, hits: [] },
    aggregations: {
      host: {
        doc_count: 0,
        results: {
          hits: {
            total: { value: 1, relation: 'eq' },
            max_score: undefined,
            hits: [
              {
                _index: 'auditbeat-7.8.0-2020.11.23-000004',
                _id: 'wRCuOnYB7WTwW_GluxL8',
                _score: undefined,
                fields: {
                  'host.hostname': [
                    'internal-ci-immutable-rm-ubuntu-2004-big2-1607296224012102773',
                  ],
                  'host.os.kernel': ['5.4.0-1030-gcp'],
                  'host.os.codename': ['focal'],
                  'host.os.name': ['Ubuntu'],
                  'host.os.family': ['debian'],
                  'host.os.version': ['20.04.1 LTS (Focal Fossa)'],
                  'host.os.platform': ['ubuntu'],
                  'host.containerized': [false],
                  'host.ip': [
                    '10.224.0.219',
                    'fe80::4001:aff:fee0:db',
                    '172.17.0.1',
                    'fe80::42:3fff:fe35:46f8',
                  ],
                  'host.name': ['internal-ci-immutable-rm-ubuntu-2004-big2-1607296224012102773'],
                  'host.id': ['a4b4839036f2d1161a21f12ea786a596'],
                  'host.mac': ['42:01:0a:e0:00:db', '02:42:3f:35:46:f8'],
                  'host.architecture': ['x86_64'],
                },
                sort: [1607302298617],
              },
            ],
          },
        },
      },
      destination: {
        meta: {},
        doc_count: 5,
        geo: {
          meta: {},
          doc_count: 5,
          results: {
            hits: {
              total: { value: 5, relation: 'eq' },
              max_score: undefined,
              hits: [
                {
                  _index: 'filebeat-8.0.0-2020.09.02-000001',
                  _id: 'dd4fa2d4bd-1523631609876537',
                  _score: undefined,
                  fields: {
                    'destination.geo.continent_name': ['North America'],
                    'destination.geo.region_iso_code': ['US-VA'],
                    'destination.geo.country_iso_code': ['US'],
                    'destination.geo.region_name': ['Virginia'],
                    'destination.geo.location': [
                      {
                        coordinates: [-77.2481, 38.6583],
                        type: 'Point',
                      },
                    ],
                  },
                  sort: [1599703212208],
                },
              ],
            },
          },
        },
        as: {
          meta: {},
          doc_count: 5,
          results: {
            hits: {
              total: { value: 5, relation: 'eq' },
              max_score: undefined,
              hits: [
                {
                  _index: 'filebeat-8.0.0-2020.09.02-000001',
                  _id: 'dd4fa2d4bd-1523631609876537',
                  _score: undefined,
                  fields: {
                    'destination.as.number': [15169],
                    'destination.as.organization.name': ['Google LLC'],
                  },
                  sort: [1599703212208],
                },
              ],
            },
          },
        },
      },
      source: {
        meta: {},
        doc_count: 5,
        geo: {
          meta: {},
          doc_count: 5,
          results: {
            hits: {
              total: { value: 5, relation: 'eq' },
              max_score: undefined,
              hits: [
                {
                  _index: 'filebeat-8.0.0-2020.09.02-000001',
                  _id: 'dd4fa2d4bd-1523631486500511',
                  _score: undefined,
                  fields: {
                    'source.geo.continent_name': ['North America'],
                    'source.geo.region_iso_code': ['US-VA'],
                    'source.geo.country_iso_code': ['US'],
                    'source.geo.region_name': ['Virginia'],
                    'source.geo.location': [
                      {
                        coordinates: [-77.2481, 38.6583],
                        type: 'Point',
                      },
                    ],
                  },
                  sort: [1599703214494],
                },
              ],
            },
          },
        },
        as: {
          meta: {},
          doc_count: 5,
          results: {
            hits: {
              total: { value: 5, relation: 'eq' },
              max_score: undefined,
              hits: [
                {
                  _index: 'filebeat-8.0.0-2020.09.02-000001',
                  _id: 'dd4fa2d4bd-1523631486500511',
                  _score: undefined,
                  fields: {
                    'source.as.number': [15169],
                    'source.as.organization.name': ['Google LLC'],
                  },
                  sort: [1599703214494],
                },
              ],
            },
          },
        },
      },
    },
  },
  total: 21,
  loaded: 21,
};

export const formattedSearchStrategyResponse = {
  ...mockSearchStrategyResponse,
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
            aggs: {
              source: {
                filter: { term: { 'source.ip': '35.196.65.164' } },
                aggs: {
                  as: {
                    filter: { exists: { field: 'source.as' } },
                    aggs: {
                      results: {
                        top_hits: {
                          size: 1,
                          _source: false,
                          fields: [
                            'source.as*',
                            {
                              field: '@timestamp',
                              format: 'strict_date_optional_time',
                            },
                          ],
                          sort: [{ '@timestamp': 'desc' }],
                        },
                      },
                    },
                  },
                  geo: {
                    filter: { exists: { field: 'source.geo' } },
                    aggs: {
                      results: {
                        top_hits: {
                          size: 1,
                          _source: false,
                          fields: [
                            'source.geo*',
                            {
                              field: '@timestamp',
                              format: 'strict_date_optional_time',
                            },
                          ],
                          sort: [{ '@timestamp': 'desc' }],
                        },
                      },
                    },
                  },
                },
              },
              destination: {
                filter: { term: { 'destination.ip': '35.196.65.164' } },
                aggs: {
                  as: {
                    filter: { exists: { field: 'destination.as' } },
                    aggs: {
                      results: {
                        top_hits: {
                          size: 1,
                          _source: false,
                          fields: [
                            'destination.as*',
                            {
                              field: '@timestamp',
                              format: 'strict_date_optional_time',
                            },
                          ],
                          sort: [{ '@timestamp': 'desc' }],
                        },
                      },
                    },
                  },
                  geo: {
                    filter: { exists: { field: 'destination.geo' } },
                    aggs: {
                      results: {
                        top_hits: {
                          size: 1,
                          _source: false,
                          fields: [
                            'destination.geo*',
                            {
                              field: '@timestamp',
                              format: 'strict_date_optional_time',
                            },
                          ],
                          sort: [{ '@timestamp': 'desc' }],
                        },
                      },
                    },
                  },
                },
              },
              host: {
                filter: { term: { 'host.ip': '35.196.65.164' } },
                aggs: {
                  results: {
                    top_hits: {
                      size: 1,
                      _source: false,
                      fields: [
                        'host*',
                        {
                          field: '@timestamp',
                          format: 'strict_date_optional_time',
                        },
                      ],
                      sort: [{ '@timestamp': 'desc' }],
                    },
                  },
                },
              },
            },
            query: { bool: { should: [] } },
            size: 0,
            _source: false,
          },
        },
        null,
        2
      ),
    ],
  },
  networkDetails: {
    source: {
      autonomousSystem: { number: [15169], organization: { name: ['Google LLC'] } },
      geo: {
        continent_name: ['North America'],
        region_iso_code: ['US-VA'],
        country_iso_code: ['US'],
        region_name: ['Virginia'],
        location: { lon: [-77.2481], lat: [38.6583] },
      },
    },
    destination: {
      autonomousSystem: { number: [15169], organization: { name: ['Google LLC'] } },
      geo: {
        continent_name: ['North America'],
        region_iso_code: ['US-VA'],
        country_iso_code: ['US'],
        region_name: ['Virginia'],
        location: { lon: [-77.2481], lat: [38.6583] },
      },
    },
    host: {
      architecture: ['x86_64'],
      containerized: [false],
      hostname: ['internal-ci-immutable-rm-ubuntu-2004-big2-1607296224012102773'],
      id: ['a4b4839036f2d1161a21f12ea786a596'],
      ip: ['10.224.0.219', 'fe80::4001:aff:fee0:db', '172.17.0.1', 'fe80::42:3fff:fe35:46f8'],
      mac: ['42:01:0a:e0:00:db', '02:42:3f:35:46:f8'],
      name: ['internal-ci-immutable-rm-ubuntu-2004-big2-1607296224012102773'],
      os: {
        codename: ['focal'],
        family: ['debian'],
        kernel: ['5.4.0-1030-gcp'],
        name: ['Ubuntu'],
        platform: ['ubuntu'],
        version: ['20.04.1 LTS (Focal Fossa)'],
      },
    },
  },
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
    aggs: {
      source: {
        filter: { term: { 'source.ip': '35.196.65.164' } },
        aggs: {
          as: {
            filter: { exists: { field: 'source.as' } },
            aggs: {
              results: {
                top_hits: {
                  size: 1,
                  _source: false,
                  fields: [
                    'source.as*',
                    {
                      field: '@timestamp',
                      format: 'strict_date_optional_time',
                    },
                  ],
                  sort: [{ '@timestamp': 'desc' }],
                },
              },
            },
          },
          geo: {
            filter: { exists: { field: 'source.geo' } },
            aggs: {
              results: {
                top_hits: {
                  size: 1,
                  _source: false,
                  fields: [
                    'source.geo*',
                    {
                      field: '@timestamp',
                      format: 'strict_date_optional_time',
                    },
                  ],
                  sort: [{ '@timestamp': 'desc' }],
                },
              },
            },
          },
        },
      },
      destination: {
        filter: { term: { 'destination.ip': '35.196.65.164' } },
        aggs: {
          as: {
            filter: { exists: { field: 'destination.as' } },
            aggs: {
              results: {
                top_hits: {
                  size: 1,
                  _source: false,
                  fields: [
                    'destination.as*',
                    {
                      field: '@timestamp',
                      format: 'strict_date_optional_time',
                    },
                  ],
                  sort: [{ '@timestamp': 'desc' }],
                },
              },
            },
          },
          geo: {
            filter: { exists: { field: 'destination.geo' } },
            aggs: {
              results: {
                top_hits: {
                  size: 1,
                  _source: false,
                  fields: [
                    'destination.geo*',
                    {
                      field: '@timestamp',
                      format: 'strict_date_optional_time',
                    },
                  ],
                  sort: [{ '@timestamp': 'desc' }],
                },
              },
            },
          },
        },
      },
      host: {
        filter: { term: { 'host.ip': '35.196.65.164' } },
        aggs: {
          results: {
            top_hits: {
              size: 1,
              _source: false,
              fields: [
                'host*',
                {
                  field: '@timestamp',
                  format: 'strict_date_optional_time',
                },
              ],
              sort: [{ '@timestamp': 'desc' }],
            },
          },
        },
      },
    },
    query: { bool: { should: [] } },
    size: 0,
    _source: false,
  },
};
