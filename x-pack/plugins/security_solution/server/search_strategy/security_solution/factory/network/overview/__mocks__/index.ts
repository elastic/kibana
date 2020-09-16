/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { IEsSearchResponse } from '../../../../../../../../../../src/plugins/data/common';

import {
  NetworkOverviewRequestOptions,
  NetworkQueries,
} from '../../../../../../../common/search_strategy';

export const mockOptions: NetworkOverviewRequestOptions = {
  defaultIndex: [
    'apm-*-transaction*',
    'auditbeat-*',
    'endgame-*',
    'filebeat-*',
    'logs-*',
    'packetbeat-*',
    'winlogbeat-*',
  ],
  factoryQueryType: NetworkQueries.overview,
  filterQuery:
    '{"bool":{"must":[],"filter":[{"match_all":{}},{"bool":{"filter":[{"bool":{"should":[{"bool":{"should":[{"exists":{"field":"source.ip"}}],"minimum_should_match":1}},{"bool":{"should":[{"exists":{"field":"destination.ip"}}],"minimum_should_match":1}}],"minimum_should_match":1}}]}}],"should":[],"must_not":[]}}',
  timerange: { interval: '12h', from: '2020-09-13T12:54:24.685Z', to: '2020-09-14T12:54:24.685Z' },
};

export const mockSearchStrategyResponse: IEsSearchResponse<unknown> = {
  isPartial: false,
  isRunning: false,
  rawResponse: {
    took: 141,
    timed_out: false,
    _shards: {
      total: 21,
      successful: 21,
      skipped: 0,
      failed: 0,
    },
    hits: {
      total: 1349108,
      max_score: 0,
      hits: [],
    },
    aggregations: {
      unique_zeek_count: {
        meta: {},
        doc_count: 0,
      },
      unique_packetbeat_count: {
        meta: {},
        doc_count: 0,
        unique_tls_count: {
          meta: {},
          doc_count: 0,
        },
      },
      unique_filebeat_count: {
        meta: {},
        doc_count: 1278559,
        unique_netflow_count: {
          doc_count: 0,
        },
        unique_cisco_count: {
          meta: {},
          doc_count: 0,
        },
        unique_panw_count: {
          meta: {},
          doc_count: 0,
        },
      },
      unique_dns_count: {
        meta: {},
        doc_count: 0,
      },
      unique_flow_count: {
        meta: {},
        doc_count: 0,
      },
      unique_socket_count: {
        doc_count: 0,
      },
      unique_suricata_count: {
        meta: {},
        doc_count: 0,
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
      '{\n  "allowNoIndices": true,\n  "index": [\n    "apm-*-transaction*",\n    "auditbeat-*",\n    "endgame-*",\n    "filebeat-*",\n    "logs-*",\n    "packetbeat-*",\n    "winlogbeat-*"\n  ],\n  "ignoreUnavailable": true,\n  "body": {\n    "aggregations": {\n      "unique_flow_count": {\n        "filter": {\n          "term": {\n            "type": "flow"\n          }\n        }\n      },\n      "unique_dns_count": {\n        "filter": {\n          "term": {\n            "type": "dns"\n          }\n        }\n      },\n      "unique_suricata_count": {\n        "filter": {\n          "term": {\n            "service.type": "suricata"\n          }\n        }\n      },\n      "unique_zeek_count": {\n        "filter": {\n          "term": {\n            "service.type": "zeek"\n          }\n        }\n      },\n      "unique_socket_count": {\n        "filter": {\n          "term": {\n            "event.dataset": "socket"\n          }\n        }\n      },\n      "unique_filebeat_count": {\n        "filter": {\n          "term": {\n            "agent.type": "filebeat"\n          }\n        },\n        "aggs": {\n          "unique_netflow_count": {\n            "filter": {\n              "term": {\n                "input.type": "netflow"\n              }\n            }\n          },\n          "unique_panw_count": {\n            "filter": {\n              "term": {\n                "event.module": "panw"\n              }\n            }\n          },\n          "unique_cisco_count": {\n            "filter": {\n              "term": {\n                "event.module": "cisco"\n              }\n            }\n          }\n        }\n      },\n      "unique_packetbeat_count": {\n        "filter": {\n          "term": {\n            "agent.type": "packetbeat"\n          }\n        },\n        "aggs": {\n          "unique_tls_count": {\n            "filter": {\n              "term": {\n                "network.protocol": "tls"\n              }\n            }\n          }\n        }\n      }\n    },\n    "query": {\n      "bool": {\n        "filter": [\n          "{\\"bool\\":{\\"must\\":[],\\"filter\\":[{\\"match_all\\":{}},{\\"bool\\":{\\"filter\\":[{\\"bool\\":{\\"should\\":[{\\"bool\\":{\\"should\\":[{\\"exists\\":{\\"field\\":\\"source.ip\\"}}],\\"minimum_should_match\\":1}},{\\"bool\\":{\\"should\\":[{\\"exists\\":{\\"field\\":\\"destination.ip\\"}}],\\"minimum_should_match\\":1}}],\\"minimum_should_match\\":1}}]}}],\\"should\\":[],\\"must_not\\":[]}}",\n          {\n            "range": {\n              "@timestamp": {\n                "gte": "2020-09-13T12:54:24.685Z",\n                "lte": "2020-09-14T12:54:24.685Z",\n                "format": "strict_date_optional_time"\n              }\n            }\n          }\n        ]\n      }\n    },\n    "size": 0,\n    "track_total_hits": false\n  }\n}',
    ],
  },
  overviewNetwork: {
    auditbeatSocket: 0,
    filebeatCisco: 0,
    filebeatNetflow: 0,
    filebeatPanw: 0,
    filebeatSuricata: 0,
    filebeatZeek: 0,
    packetbeatDNS: 0,
    packetbeatFlow: 0,
    packetbeatTLS: 0,
  },
};

export const expectedDsl = {
  allowNoIndices: true,
  ignoreUnavailable: true,
  index: [
    'apm-*-transaction*',
    'auditbeat-*',
    'endgame-*',
    'filebeat-*',
    'logs-*',
    'packetbeat-*',
    'winlogbeat-*',
  ],
  body: {
    aggregations: {
      unique_flow_count: {
        filter: {
          term: {
            type: 'flow',
          },
        },
      },
      unique_dns_count: {
        filter: {
          term: {
            type: 'dns',
          },
        },
      },
      unique_suricata_count: {
        filter: {
          term: {
            'service.type': 'suricata',
          },
        },
      },
      unique_zeek_count: {
        filter: {
          term: {
            'service.type': 'zeek',
          },
        },
      },
      unique_socket_count: {
        filter: {
          term: {
            'event.dataset': 'socket',
          },
        },
      },
      unique_filebeat_count: {
        filter: {
          term: {
            'agent.type': 'filebeat',
          },
        },
        aggs: {
          unique_netflow_count: {
            filter: {
              term: {
                'input.type': 'netflow',
              },
            },
          },
          unique_panw_count: {
            filter: {
              term: {
                'event.module': 'panw',
              },
            },
          },
          unique_cisco_count: {
            filter: {
              term: {
                'event.module': 'cisco',
              },
            },
          },
        },
      },
      unique_packetbeat_count: {
        filter: {
          term: {
            'agent.type': 'packetbeat',
          },
        },
        aggs: {
          unique_tls_count: {
            filter: {
              term: {
                'network.protocol': 'tls',
              },
            },
          },
        },
      },
    },
  },
};
