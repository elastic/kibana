/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { IEsSearchResponse } from '../../../../../../../../../../src/plugins/data/common';
import {
  HostsQueries,
  HostOverviewRequestOptions,
} from '../../../../../../../common/search_strategy';

export const mockOptions: HostOverviewRequestOptions = {
  defaultIndex: [
    'apm-*-transaction*',
    'auditbeat-*',
    'endgame-*',
    'filebeat-*',
    'logs-*',
    'packetbeat-*',
    'winlogbeat-*',
  ],
  factoryQueryType: HostsQueries.overview,
  filterQuery:
    '{"bool":{"must":[],"filter":[{"match_all":{}},{"bool":{"filter":[{"bool":{"should":[{"exists":{"field":"host.name"}}],"minimum_should_match":1}}]}}],"should":[],"must_not":[]}}',
  timerange: { interval: '12h', from: '2020-09-07T09:47:28.606Z', to: '2020-09-08T09:47:28.606Z' },
};

export const mockSearchStrategyResponse: IEsSearchResponse<unknown> = {
  isPartial: false,
  isRunning: false,
  rawResponse: {
    took: 45,
    timed_out: false,
    _shards: { total: 21, successful: 21, skipped: 0, failed: 0 },
    hits: { total: -1, max_score: 0, hits: [] },
    aggregations: {
      fim_count: { meta: {}, doc_count: 0 },
      endgame_module: {
        meta: {},
        doc_count: 66903,
        process_event_count: { meta: {}, doc_count: 52981 },
        dns_event_count: { meta: {}, doc_count: 0 },
        network_event_count: { meta: {}, doc_count: 9860 },
        security_event_count: { meta: {}, doc_count: 0 },
        image_load_event_count: { meta: {}, doc_count: 0 },
        registry_event: { meta: {}, doc_count: 0 },
        file_event_count: { meta: {}, doc_count: 4062 },
      },
      winlog_module: {
        meta: {},
        doc_count: 1949,
        mwsysmon_operational_event_count: { meta: {}, doc_count: 1781 },
        security_event_count: { meta: {}, doc_count: 42 },
      },
      auditd_count: { meta: {}, doc_count: 0 },
      system_module: {
        meta: {},
        doc_count: 1793,
        package_count: { doc_count: 0 },
        login_count: { doc_count: 0 },
        user_count: { doc_count: 0 },
        process_count: { doc_count: 0 },
        filebeat_count: { doc_count: 1793 },
      },
    },
  },
  total: 21,
  loaded: 21,
};

export const formattedSearchStrategyResponse = {
  isPartial: false,
  isRunning: false,
  rawResponse: {
    took: 45,
    timed_out: false,
    _shards: { total: 21, successful: 21, skipped: 0, failed: 0 },
    hits: { total: -1, max_score: 0, hits: [] },
    aggregations: {
      fim_count: { meta: {}, doc_count: 0 },
      endgame_module: {
        meta: {},
        doc_count: 66903,
        process_event_count: { meta: {}, doc_count: 52981 },
        dns_event_count: { meta: {}, doc_count: 0 },
        network_event_count: { meta: {}, doc_count: 9860 },
        security_event_count: { meta: {}, doc_count: 0 },
        image_load_event_count: { meta: {}, doc_count: 0 },
        registry_event: { meta: {}, doc_count: 0 },
        file_event_count: { meta: {}, doc_count: 4062 },
      },
      winlog_module: {
        meta: {},
        doc_count: 1949,
        mwsysmon_operational_event_count: { meta: {}, doc_count: 1781 },
        security_event_count: { meta: {}, doc_count: 42 },
      },
      auditd_count: { meta: {}, doc_count: 0 },
      system_module: {
        meta: {},
        doc_count: 1793,
        package_count: { doc_count: 0 },
        login_count: { doc_count: 0 },
        user_count: { doc_count: 0 },
        process_count: { doc_count: 0 },
        filebeat_count: { doc_count: 1793 },
      },
    },
  },
  total: 21,
  loaded: 21,
  inspect: {
    dsl: [
      '{\n  "allowNoIndices": true,\n  "index": [\n    "apm-*-transaction*",\n    "auditbeat-*",\n    "endgame-*",\n    "filebeat-*",\n    "logs-*",\n    "packetbeat-*",\n    "winlogbeat-*"\n  ],\n  "ignoreUnavailable": true,\n  "body": {\n    "aggregations": {\n      "auditd_count": {\n        "filter": {\n          "term": {\n            "event.module": "auditd"\n          }\n        }\n      },\n      "endgame_module": {\n        "filter": {\n          "bool": {\n            "should": [\n              {\n                "term": {\n                  "event.module": "endpoint"\n                }\n              },\n              {\n                "term": {\n                  "event.module": "endgame"\n                }\n              }\n            ]\n          }\n        },\n        "aggs": {\n          "dns_event_count": {\n            "filter": {\n              "bool": {\n                "should": [\n                  {\n                    "bool": {\n                      "filter": [\n                        {\n                          "term": {\n                            "network.protocol": "dns"\n                          }\n                        },\n                        {\n                          "term": {\n                            "event.category": "network"\n                          }\n                        }\n                      ]\n                    }\n                  },\n                  {\n                    "term": {\n                      "endgame.event_type_full": "dns_event"\n                    }\n                  }\n                ]\n              }\n            }\n          },\n          "file_event_count": {\n            "filter": {\n              "bool": {\n                "should": [\n                  {\n                    "term": {\n                      "event.category": "file"\n                    }\n                  },\n                  {\n                    "term": {\n                      "endgame.event_type_full": "file_event"\n                    }\n                  }\n                ]\n              }\n            }\n          },\n          "image_load_event_count": {\n            "filter": {\n              "bool": {\n                "should": [\n                  {\n                    "bool": {\n                      "should": [\n                        {\n                          "term": {\n                            "event.category": "library"\n                          }\n                        },\n                        {\n                          "term": {\n                            "event.category": "driver"\n                          }\n                        }\n                      ]\n                    }\n                  },\n                  {\n                    "term": {\n                      "endgame.event_type_full": "image_load_event"\n                    }\n                  }\n                ]\n              }\n            }\n          },\n          "network_event_count": {\n            "filter": {\n              "bool": {\n                "should": [\n                  {\n                    "bool": {\n                      "filter": [\n                        {\n                          "bool": {\n                            "must_not": {\n                              "term": {\n                                "network.protocol": "dns"\n                              }\n                            }\n                          }\n                        },\n                        {\n                          "term": {\n                            "event.category": "network"\n                          }\n                        }\n                      ]\n                    }\n                  },\n                  {\n                    "term": {\n                      "endgame.event_type_full": "network_event"\n                    }\n                  }\n                ]\n              }\n            }\n          },\n          "process_event_count": {\n            "filter": {\n              "bool": {\n                "should": [\n                  {\n                    "term": {\n                      "event.category": "process"\n                    }\n                  },\n                  {\n                    "term": {\n                      "endgame.event_type_full": "process_event"\n                    }\n                  }\n                ]\n              }\n            }\n          },\n          "registry_event": {\n            "filter": {\n              "bool": {\n                "should": [\n                  {\n                    "term": {\n                      "event.category": "registry"\n                    }\n                  },\n                  {\n                    "term": {\n                      "endgame.event_type_full": "registry_event"\n                    }\n                  }\n                ]\n              }\n            }\n          },\n          "security_event_count": {\n            "filter": {\n              "bool": {\n                "should": [\n                  {\n                    "bool": {\n                      "filter": [\n                        {\n                          "term": {\n                            "event.category": "session"\n                          }\n                        },\n                        {\n                          "term": {\n                            "event.category": "authentication"\n                          }\n                        }\n                      ]\n                    }\n                  },\n                  {\n                    "term": {\n                      "endgame.event_type_full": "security_event"\n                    }\n                  }\n                ]\n              }\n            }\n          }\n        }\n      },\n      "fim_count": {\n        "filter": {\n          "term": {\n            "event.module": "file_integrity"\n          }\n        }\n      },\n      "winlog_module": {\n        "filter": {\n          "term": {\n            "agent.type": "winlogbeat"\n          }\n        },\n        "aggs": {\n          "mwsysmon_operational_event_count": {\n            "filter": {\n              "term": {\n                "winlog.channel": "Microsoft-Windows-Sysmon/Operational"\n              }\n            }\n          },\n          "security_event_count": {\n            "filter": {\n              "term": {\n                "winlog.channel": "Security"\n              }\n            }\n          }\n        }\n      },\n      "system_module": {\n        "filter": {\n          "term": {\n            "event.module": "system"\n          }\n        },\n        "aggs": {\n          "login_count": {\n            "filter": {\n              "term": {\n                "event.dataset": "login"\n              }\n            }\n          },\n          "package_count": {\n            "filter": {\n              "term": {\n                "event.dataset": "package"\n              }\n            }\n          },\n          "process_count": {\n            "filter": {\n              "term": {\n                "event.dataset": "process"\n              }\n            }\n          },\n          "user_count": {\n            "filter": {\n              "term": {\n                "event.dataset": "user"\n              }\n            }\n          },\n          "filebeat_count": {\n            "filter": {\n              "term": {\n                "agent.type": "filebeat"\n              }\n            }\n          }\n        }\n      }\n    },\n    "query": {\n      "bool": {\n        "filter": [\n          "{\\"bool\\":{\\"must\\":[],\\"filter\\":[{\\"match_all\\":{}},{\\"bool\\":{\\"filter\\":[{\\"bool\\":{\\"should\\":[{\\"exists\\":{\\"field\\":\\"host.name\\"}}],\\"minimum_should_match\\":1}}]}}],\\"should\\":[],\\"must_not\\":[]}}",\n          {\n            "range": {\n              "@timestamp": {\n                "gte": "2020-09-07T09:47:28.606Z",\n                "lte": "2020-09-08T09:47:28.606Z",\n                "format": "strict_date_optional_time"\n              }\n            }\n          }\n        ]\n      }\n    },\n    "size": 0,\n    "track_total_hits": false\n  }\n}',
    ],
  },
  overviewHost: {
    auditbeatAuditd: 0,
    auditbeatFIM: 0,
    auditbeatLogin: 0,
    auditbeatPackage: 0,
    auditbeatProcess: 0,
    auditbeatUser: 0,
    endgameDns: 0,
    endgameFile: 4062,
    endgameImageLoad: 0,
    endgameNetwork: 9860,
    endgameProcess: 52981,
    endgameRegistry: 0,
    endgameSecurity: 0,
    filebeatSystemModule: 1793,
    winlogbeatSecurity: 42,
    winlogbeatMWSysmonOperational: null,
  },
};

export const expectedDsl = {
  allowNoIndices: true,
  index: [
    'apm-*-transaction*',
    'auditbeat-*',
    'endgame-*',
    'filebeat-*',
    'logs-*',
    'packetbeat-*',
    'winlogbeat-*',
  ],
  ignoreUnavailable: true,
  body: {
    aggregations: {
      auditd_count: { filter: { term: { 'event.module': 'auditd' } } },
      endgame_module: {
        filter: {
          bool: {
            should: [
              { term: { 'event.module': 'endpoint' } },
              { term: { 'event.module': 'endgame' } },
            ],
          },
        },
        aggs: {
          dns_event_count: {
            filter: {
              bool: {
                should: [
                  {
                    bool: {
                      filter: [
                        { term: { 'network.protocol': 'dns' } },
                        { term: { 'event.category': 'network' } },
                      ],
                    },
                  },
                  { term: { 'endgame.event_type_full': 'dns_event' } },
                ],
              },
            },
          },
          file_event_count: {
            filter: {
              bool: {
                should: [
                  { term: { 'event.category': 'file' } },
                  { term: { 'endgame.event_type_full': 'file_event' } },
                ],
              },
            },
          },
          image_load_event_count: {
            filter: {
              bool: {
                should: [
                  {
                    bool: {
                      should: [
                        { term: { 'event.category': 'library' } },
                        { term: { 'event.category': 'driver' } },
                      ],
                    },
                  },
                  { term: { 'endgame.event_type_full': 'image_load_event' } },
                ],
              },
            },
          },
          network_event_count: {
            filter: {
              bool: {
                should: [
                  {
                    bool: {
                      filter: [
                        { bool: { must_not: { term: { 'network.protocol': 'dns' } } } },
                        { term: { 'event.category': 'network' } },
                      ],
                    },
                  },
                  { term: { 'endgame.event_type_full': 'network_event' } },
                ],
              },
            },
          },
          process_event_count: {
            filter: {
              bool: {
                should: [
                  { term: { 'event.category': 'process' } },
                  { term: { 'endgame.event_type_full': 'process_event' } },
                ],
              },
            },
          },
          registry_event: {
            filter: {
              bool: {
                should: [
                  { term: { 'event.category': 'registry' } },
                  { term: { 'endgame.event_type_full': 'registry_event' } },
                ],
              },
            },
          },
          security_event_count: {
            filter: {
              bool: {
                should: [
                  {
                    bool: {
                      filter: [
                        { term: { 'event.category': 'session' } },
                        { term: { 'event.category': 'authentication' } },
                      ],
                    },
                  },
                  { term: { 'endgame.event_type_full': 'security_event' } },
                ],
              },
            },
          },
        },
      },
      fim_count: { filter: { term: { 'event.module': 'file_integrity' } } },
      winlog_module: {
        filter: { term: { 'agent.type': 'winlogbeat' } },
        aggs: {
          mwsysmon_operational_event_count: {
            filter: { term: { 'winlog.channel': 'Microsoft-Windows-Sysmon/Operational' } },
          },
          security_event_count: { filter: { term: { 'winlog.channel': 'Security' } } },
        },
      },
      system_module: {
        filter: { term: { 'event.module': 'system' } },
        aggs: {
          login_count: { filter: { term: { 'event.dataset': 'login' } } },
          package_count: { filter: { term: { 'event.dataset': 'package' } } },
          process_count: { filter: { term: { 'event.dataset': 'process' } } },
          user_count: { filter: { term: { 'event.dataset': 'user' } } },
          filebeat_count: { filter: { term: { 'agent.type': 'filebeat' } } },
        },
      },
    },
    query: {
      bool: {
        filter: [
          '{"bool":{"must":[],"filter":[{"match_all":{}},{"bool":{"filter":[{"bool":{"should":[{"exists":{"field":"host.name"}}],"minimum_should_match":1}}]}}],"should":[],"must_not":[]}}',
          {
            range: {
              '@timestamp': {
                gte: '2020-09-07T09:47:28.606Z',
                lte: '2020-09-08T09:47:28.606Z',
                format: 'strict_date_optional_time',
              },
            },
          },
        ],
      },
    },
    size: 0,
    track_total_hits: false,
  },
};
