/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { HostUncommonProcessesRequestOptions } from '../../../../../../../common/api/search_strategy';
import { Direction, HostsQueries } from '../../../../../../../common/search_strategy';

export const mockOptions: HostUncommonProcessesRequestOptions = {
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
  factoryQueryType: HostsQueries.uncommonProcesses,
  filterQuery:
    '{"bool":{"must":[],"filter":[{"match_all":{}},{"match_phrase":{"host.name":{"query":"siem-kibana"}}}],"should":[],"must_not":[]}}',
  pagination: {
    activePage: 0,
    cursorStart: 0,
    fakePossibleCount: 50,
    querySize: 10,
  },
  sort: {
    direction: Direction.desc,
    field: '@timestamp',
  },
  timerange: {
    interval: '12h',
    from: '2020-09-06T15:23:52.757Z',
    to: '2020-09-07T15:23:52.757Z',
  },
};

export const mockSearchStrategyResponse = {
  isPartial: false,
  isRunning: false,
  rawResponse: {
    took: 39,
    timed_out: false,
    _shards: {
      total: 21,
      successful: 21,
      skipped: 0,
      failed: 0,
    },
    hits: {
      total: -1,
      max_score: 0,
      hits: [],
    },
    aggregations: {
      process_count: {
        value: 92,
      },
      group_by_process: {
        doc_count_error_upper_bound: -1,
        sum_other_doc_count: 35043,
        buckets: [
          {
            key: 'AM_Delta_Patch_1.323.631.0.exe',
            doc_count: 1,
            process: {
              hits: {
                total: 1,
                max_score: 0,
                hits: [
                  {
                    _index: 'winlogbeat-8.0.0-2020.09.02-000001',
                    _id: 'ayrMZnQBB-gskcly0w7l',
                    _score: null,
                    fields: {
                      'process.args': [
                        'C:\\Windows\\SoftwareDistribution\\Download\\Install\\AM_Delta_Patch_1.323.631.0.exe',
                        'WD',
                        '/q',
                      ],
                      'process.name': ['AM_Delta_Patch_1.323.631.0.exe'],
                      'user.name': ['SYSTEM'],
                    },
                    sort: [1599452531834],
                  },
                ],
              },
            },
            hosts: {
              doc_count_error_upper_bound: 0,
              sum_other_doc_count: 0,
              buckets: [
                {
                  key: 'siem-windows',
                  doc_count: 1,
                  host: {
                    hits: {
                      total: 1,
                      max_score: 0,
                      hits: [
                        {
                          _index: 'winlogbeat-8.0.0-2020.09.02-000001',
                          _id: 'ayrMZnQBB-gskcly0w7l',
                          _score: 0,
                          fields: {
                            'process.args': [
                              'C:\\Windows\\SoftwareDistribution\\Download\\Install\\AM_Delta_Patch_1.323.631.0.exe',
                              'WD',
                              '/q',
                            ],
                            'process.name': ['AM_Delta_Patch_1.323.631.0.exe'],
                            '@timestamp': '2020-09-07T04:22:11.834Z',
                            'host.name': ['siem-windows'],
                            'user.name': ['SYSTEM'],
                          },
                        },
                      ],
                    },
                  },
                },
              ],
            },
            host_count: {
              value: 1,
            },
          },
          {
            key: 'AM_Delta_Patch_1.323.673.0.exe',
            doc_count: 1,
            process: {
              hits: {
                total: 1,
                max_score: 0,
                hits: [
                  {
                    _index: 'winlogbeat-8.0.0-2020.09.02-000001',
                    _id: 'M-GvaHQBA6bGZw2uBoYz',
                    _score: null,
                    fields: {
                      'process.args': [
                        'C:\\Windows\\SoftwareDistribution\\Download\\Install\\AM_Delta_Patch_1.323.673.0.exe',
                        'WD',
                        '/q',
                      ],
                      'process.name': ['AM_Delta_Patch_1.323.673.0.exe'],
                      '@timestamp': '2020-09-07T04:22:11.834Z',
                      'user.name': ['SYSTEM'],
                    },
                    sort: [1599484132366],
                  },
                ],
              },
            },
            hosts: {
              doc_count_error_upper_bound: 0,
              sum_other_doc_count: 0,
              buckets: [
                {
                  key: 'siem-windows',
                  doc_count: 1,
                  host: {
                    hits: {
                      total: 1,
                      max_score: 0,
                      hits: [
                        {
                          _index: 'winlogbeat-8.0.0-2020.09.02-000001',
                          _id: 'M-GvaHQBA6bGZw2uBoYz',
                          _score: 0,
                          fields: {
                            'process.args': [
                              'C:\\Windows\\SoftwareDistribution\\Download\\Install\\AM_Delta_Patch_1.323.673.0.exe',
                              'WD',
                              '/q',
                            ],
                            'process.name': ['AM_Delta_Patch_1.323.673.0.exe'],
                            'host.name': ['siem-windows'],
                            'user.name': ['SYSTEM'],
                            '@timestamp': '2020-09-07T13:08:52.366Z',
                          },
                        },
                      ],
                    },
                  },
                },
              ],
            },
            host_count: {
              value: 1,
            },
          },
          {
            key: 'DeviceCensus.exe',
            doc_count: 1,
            process: {
              hits: {
                total: 1,
                max_score: 0,
                hits: [
                  {
                    _index: 'winlogbeat-8.0.0-2020.09.02-000001',
                    _id: 'cinEZnQBB-gskclyvNmU',
                    _score: null,
                    fields: {
                      'process.args': ['C:\\Windows\\system32\\devicecensus.exe'],
                      'process.name': ['DeviceCensus.exe'],
                      'user.name': ['SYSTEM'],
                    },
                    sort: [1599452000791],
                  },
                ],
              },
            },
            hosts: {
              doc_count_error_upper_bound: 0,
              sum_other_doc_count: 0,
              buckets: [
                {
                  key: 'siem-windows',
                  doc_count: 1,
                  host: {
                    hits: {
                      total: 1,
                      max_score: 0,
                      hits: [
                        {
                          _index: 'winlogbeat-8.0.0-2020.09.02-000001',
                          _id: 'cinEZnQBB-gskclyvNmU',
                          _score: 0,
                          fields: {
                            'process.args': ['C:\\Windows\\system32\\devicecensus.exe'],
                            'process.name': ['DeviceCensus.exe'],
                            'host.name': ['siem-windows'],
                            'user.name': ['SYSTEM'],
                            '@timestamp': '2020-09-07T04:13:20.791Z',
                          },
                        },
                      ],
                    },
                  },
                },
              ],
            },
            host_count: {
              value: 1,
            },
          },
          {
            key: 'DiskSnapshot.exe',
            doc_count: 1,
            process: {
              hits: {
                total: 1,
                max_score: 0,
                hits: [
                  {
                    _index: 'winlogbeat-8.0.0-2020.09.02-000001',
                    _id: 'HNKSZHQBA6bGZw2uCtRk',
                    _score: null,
                    fields: {
                      'process.args': ['C:\\Windows\\system32\\disksnapshot.exe', '-z'],
                      'process.name': ['DiskSnapshot.exe'],
                      'user.name': ['SYSTEM'],
                    },
                    sort: [1599415124040],
                  },
                ],
              },
            },
            hosts: {
              doc_count_error_upper_bound: 0,
              sum_other_doc_count: 0,
              buckets: [
                {
                  key: 'siem-windows',
                  doc_count: 1,
                  host: {
                    hits: {
                      total: 1,
                      max_score: 0,
                      hits: [
                        {
                          _index: 'winlogbeat-8.0.0-2020.09.02-000001',
                          _id: 'HNKSZHQBA6bGZw2uCtRk',
                          _score: 0,
                          fields: {
                            'process.args': ['C:\\Windows\\system32\\disksnapshot.exe', '-z'],
                            'process.name': ['DiskSnapshot.exe'],
                            'host.name': ['siem-windows'],
                            'user.name': ['SYSTEM'],
                            '@timestamp': '2020-09-06T17:58:44.040Z',
                          },
                        },
                      ],
                    },
                  },
                },
              ],
            },
            host_count: {
              value: 1,
            },
          },
          {
            key: 'DismHost.exe',
            doc_count: 1,
            process: {
              hits: {
                total: 1,
                max_score: 0,
                hits: [
                  {
                    _index: 'winlogbeat-8.0.0-2020.09.02-000001',
                    _id: '2zncaHQBB-gskcly1QaD',
                    _score: null,
                    fields: {
                      'process.args': [
                        'C:\\Windows\\TEMP\\88C4F57A-8744-4EA6-824E-88FEF8A0E9DD\\dismhost.exe',
                        '{6BB79B50-2038-4A10-B513-2FAC72FF213E}',
                      ],
                      'process.name': ['DismHost.exe'],
                      'user.name': ['SYSTEM'],
                    },
                    sort: [1599487135371],
                  },
                ],
              },
            },
            hosts: {
              doc_count_error_upper_bound: 0,
              sum_other_doc_count: 0,
              buckets: [
                {
                  key: 'siem-windows',
                  doc_count: 1,
                  host: {
                    hits: {
                      total: 1,
                      max_score: 0,
                      hits: [
                        {
                          _index: 'winlogbeat-8.0.0-2020.09.02-000001',
                          _id: '2zncaHQBB-gskcly1QaD',
                          _score: 0,
                          fields: {
                            'process.args': [
                              'C:\\Windows\\TEMP\\88C4F57A-8744-4EA6-824E-88FEF8A0E9DD\\dismhost.exe',
                              '{6BB79B50-2038-4A10-B513-2FAC72FF213E}',
                            ],
                            'process.name': ['DismHost.exe'],
                            'host.name': ['siem-windows'],
                            'user.name': ['SYSTEM'],
                            '@timestamp': '2020-09-07T13:58:55.371Z',
                          },
                        },
                      ],
                    },
                  },
                },
              ],
            },
            host_count: {
              value: 1,
            },
          },
          {
            key: 'SIHClient.exe',
            doc_count: 1,
            process: {
              hits: {
                total: 1,
                max_score: 0,
                hits: [
                  {
                    _index: 'winlogbeat-8.0.0-2020.09.02-000001',
                    _id: 'gdVuZXQBA6bGZw2uFsPP',
                    _score: null,
                    fields: {
                      'process.args': [
                        'C:\\Windows\\System32\\sihclient.exe',
                        '/cv',
                        '33nfV21X50ie84HvATAt1w.0.1',
                      ],
                      'process.name': ['SIHClient.exe'],
                      'user.name': ['SYSTEM'],
                    },
                    sort: [1599429545370],
                  },
                ],
              },
            },
            hosts: {
              doc_count_error_upper_bound: 0,
              sum_other_doc_count: 0,
              buckets: [
                {
                  key: 'siem-windows',
                  doc_count: 1,
                  host: {
                    hits: {
                      total: 1,
                      max_score: 0,
                      hits: [
                        {
                          _index: 'winlogbeat-8.0.0-2020.09.02-000001',
                          _id: 'gdVuZXQBA6bGZw2uFsPP',
                          _score: 0,
                          fields: {
                            'process.args': [
                              'C:\\Windows\\System32\\sihclient.exe',
                              '/cv',
                              '33nfV21X50ie84HvATAt1w.0.1',
                            ],
                            'process.name': ['SIHClient.exe'],
                            'host.name': ['siem-windows'],
                            'user.name': ['SYSTEM'],
                            '@timestamp': '2020-09-06T21:59:05.370Z',
                          },
                        },
                      ],
                    },
                  },
                },
              ],
            },
            host_count: {
              value: 1,
            },
          },
          {
            key: 'SpeechModelDownload.exe',
            doc_count: 1,
            process: {
              hits: {
                total: 1,
                max_score: 0,
                hits: [
                  {
                    _index: 'winlogbeat-8.0.0-2020.09.02-000001',
                    _id: '6NmKZnQBA6bGZw2uma12',
                    _score: null,
                    fields: {
                      'process.args': [
                        'C:\\Windows\\system32\\speech_onecore\\common\\SpeechModelDownload.exe',
                      ],
                      'process.name': ['SpeechModelDownload.exe'],
                      'user.name': ['NETWORK SERVICE'],
                    },
                    sort: [1599448191225],
                  },
                ],
              },
            },
            hosts: {
              doc_count_error_upper_bound: 0,
              sum_other_doc_count: 0,
              buckets: [
                {
                  key: 'siem-windows',
                  doc_count: 1,
                  host: {
                    hits: {
                      total: 1,
                      max_score: 0,
                      hits: [
                        {
                          _index: 'winlogbeat-8.0.0-2020.09.02-000001',
                          _id: '6NmKZnQBA6bGZw2uma12',
                          _score: 0,
                          fields: {
                            'process.args': [
                              'C:\\Windows\\system32\\speech_onecore\\common\\SpeechModelDownload.exe',
                            ],
                            'process.name': ['SpeechModelDownload.exe'],
                            'host.name': ['siem-windows'],
                            'user.name': ['NETWORK SERVICE'],
                            '@timestamp': '2020-09-07T03:09:51.225Z',
                          },
                        },
                      ],
                    },
                  },
                },
              ],
            },
            host_count: {
              value: 1,
            },
          },
          {
            key: 'UsoClient.exe',
            doc_count: 1,
            process: {
              hits: {
                total: 1,
                max_score: 0,
                hits: [
                  {
                    _index: 'winlogbeat-8.0.0-2020.09.02-000001',
                    _id: 'Pi68Z3QBc39KFIJb3txa',
                    _score: null,
                    fields: {
                      'process.args': ['C:\\Windows\\system32\\usoclient.exe', 'StartScan'],
                      'process.name': ['UsoClient.exe'],
                      'user.name': ['SYSTEM'],
                    },
                    sort: [1599468262455],
                  },
                ],
              },
            },
            hosts: {
              doc_count_error_upper_bound: 0,
              sum_other_doc_count: 0,
              buckets: [
                {
                  key: 'siem-windows',
                  doc_count: 1,
                  host: {
                    hits: {
                      total: 1,
                      max_score: 0,
                      hits: [
                        {
                          _index: 'winlogbeat-8.0.0-2020.09.02-000001',
                          _id: 'Pi68Z3QBc39KFIJb3txa',
                          _score: 0,
                          fields: {
                            'process.args': ['C:\\Windows\\system32\\usoclient.exe', 'StartScan'],
                            'process.name': ['UsoClient.exe'],
                            'host.name': ['siem-windows'],
                            'user.name': ['SYSTEM'],
                            '@timestamp': '2020-09-07T08:44:22.455Z',
                          },
                        },
                      ],
                    },
                  },
                },
              ],
            },
            host_count: {
              value: 1,
            },
          },
          {
            key: 'apt-compat',
            doc_count: 1,
            process: {
              hits: {
                total: 1,
                max_score: 0,
                hits: [
                  {
                    _index: '.ds-logs-endpoint.events.process-default-000001',
                    _id: 'Ziw-Z3QBB-gskcly0vqU',
                    _score: null,
                    fields: {
                      'process.args': ['/etc/cron.daily/apt-compat'],
                      'process.name': ['apt-compat'],
                      'user.name': ['root'],
                      'user.id': [0],
                    },
                    sort: [1599459901154],
                  },
                ],
              },
            },
            hosts: {
              doc_count_error_upper_bound: 0,
              sum_other_doc_count: 0,
              buckets: [
                {
                  key: 'siem-kibana',
                  doc_count: 1,
                  host: {
                    hits: {
                      total: 1,
                      max_score: 0,
                      hits: [
                        {
                          _index: '.ds-logs-endpoint.events.process-default-000001',
                          _id: 'Ziw-Z3QBB-gskcly0vqU',
                          _score: 0,
                          fields: {
                            'process.args': ['/etc/cron.daily/apt-compat'],
                            'process.name': ['apt-compat'],
                            'host.name': ['siem-kibana'],
                            'user.name': ['root'],
                            'user.id': [0],
                            '@timestamp': '2020-09-07T06:25:01.154464000Z',
                          },
                        },
                      ],
                    },
                  },
                },
              ],
            },
            host_count: {
              value: 1,
            },
          },
          {
            key: 'bsdmainutils',
            doc_count: 1,
            process: {
              hits: {
                total: 1,
                max_score: 0,
                hits: [
                  {
                    _index: '.ds-logs-endpoint.events.process-default-000001',
                    _id: 'aSw-Z3QBB-gskcly0vqU',
                    _score: null,
                    fields: {
                      'process.args': ['/etc/cron.daily/bsdmainutils'],
                      'process.name': ['bsdmainutils'],
                      'user.name': ['root'],
                      'user.id': [0],
                    },
                    sort: [1599459901155],
                  },
                ],
              },
            },
            hosts: {
              doc_count_error_upper_bound: 0,
              sum_other_doc_count: 0,
              buckets: [
                {
                  key: 'siem-kibana',
                  doc_count: 1,
                  host: {
                    hits: {
                      total: 1,
                      max_score: 0,
                      hits: [
                        {
                          _index: '.ds-logs-endpoint.events.process-default-000001',
                          _id: 'aSw-Z3QBB-gskcly0vqU',
                          _score: 0,
                          fields: {
                            'process.args': ['/etc/cron.daily/bsdmainutils'],
                            'process.name': ['bsdmainutils'],
                            'host.name': ['siem-kibana'],
                            'user.name': ['root'],
                            'user.id': [0],
                            '@timestamp': '2020-09-07T06:25:01.155812000Z',
                          },
                        },
                      ],
                    },
                  },
                },
              ],
            },
            host_count: {
              value: 1,
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
  isPartial: false,
  isRunning: false,
  rawResponse: {
    took: 39,
    timed_out: false,
    _shards: {
      total: 21,
      successful: 21,
      skipped: 0,
      failed: 0,
    },
    hits: {
      total: -1,
      max_score: 0,
      hits: [],
    },
    aggregations: {
      process_count: {
        value: 92,
      },
      group_by_process: {
        doc_count_error_upper_bound: -1,
        sum_other_doc_count: 35043,
        buckets: [
          {
            key: 'AM_Delta_Patch_1.323.631.0.exe',
            doc_count: 1,
            process: {
              hits: {
                total: 1,
                max_score: 0,
                hits: [
                  {
                    _index: 'winlogbeat-8.0.0-2020.09.02-000001',
                    _id: 'ayrMZnQBB-gskcly0w7l',
                    _score: null,
                    fields: {
                      'process.args': [
                        'C:\\Windows\\SoftwareDistribution\\Download\\Install\\AM_Delta_Patch_1.323.631.0.exe',
                        'WD',
                        '/q',
                      ],
                      'process.name': ['AM_Delta_Patch_1.323.631.0.exe'],
                      'user.name': ['SYSTEM'],
                    },
                    sort: [1599452531834],
                  },
                ],
              },
            },
            hosts: {
              doc_count_error_upper_bound: 0,
              sum_other_doc_count: 0,
              buckets: [
                {
                  key: 'siem-windows',
                  doc_count: 1,
                  host: {
                    hits: {
                      total: 1,
                      max_score: 0,
                      hits: [
                        {
                          _index: 'winlogbeat-8.0.0-2020.09.02-000001',
                          _id: 'ayrMZnQBB-gskcly0w7l',
                          _score: 0,
                          fields: {
                            'process.args': [
                              'C:\\Windows\\SoftwareDistribution\\Download\\Install\\AM_Delta_Patch_1.323.631.0.exe',
                              'WD',
                              '/q',
                            ],
                            'process.name': ['AM_Delta_Patch_1.323.631.0.exe'],
                            'host.name': ['siem-windows'],
                            'user.name': ['SYSTEM'],
                            '@timestamp': '2020-09-07T04:22:11.834Z',
                          },
                        },
                      ],
                    },
                  },
                },
              ],
            },
            host_count: {
              value: 1,
            },
          },
          {
            key: 'AM_Delta_Patch_1.323.673.0.exe',
            doc_count: 1,
            process: {
              hits: {
                total: 1,
                max_score: 0,
                hits: [
                  {
                    _index: 'winlogbeat-8.0.0-2020.09.02-000001',
                    _id: 'M-GvaHQBA6bGZw2uBoYz',
                    _score: null,
                    fields: {
                      'process.args': [
                        'C:\\Windows\\SoftwareDistribution\\Download\\Install\\AM_Delta_Patch_1.323.673.0.exe',
                        'WD',
                        '/q',
                      ],
                      'process.name': ['AM_Delta_Patch_1.323.673.0.exe'],
                      'user.name': ['SYSTEM'],
                    },
                    sort: [1599484132366],
                  },
                ],
              },
            },
            hosts: {
              doc_count_error_upper_bound: 0,
              sum_other_doc_count: 0,
              buckets: [
                {
                  key: 'siem-windows',
                  doc_count: 1,
                  host: {
                    hits: {
                      total: 1,
                      max_score: 0,
                      hits: [
                        {
                          _index: 'winlogbeat-8.0.0-2020.09.02-000001',
                          _id: 'M-GvaHQBA6bGZw2uBoYz',
                          _score: 0,
                          fields: {
                            'process.args': [
                              'C:\\Windows\\SoftwareDistribution\\Download\\Install\\AM_Delta_Patch_1.323.673.0.exe',
                              'WD',
                              '/q',
                            ],
                            'process.name': ['AM_Delta_Patch_1.323.673.0.exe'],
                            'host.name': ['siem-windows'],
                            'user.name': ['SYSTEM'],
                            '@timestamp': '2020-09-07T13:08:52.366Z',
                          },
                        },
                      ],
                    },
                  },
                },
              ],
            },
            host_count: {
              value: 1,
            },
          },
          {
            key: 'DeviceCensus.exe',
            doc_count: 1,
            process: {
              hits: {
                total: 1,
                max_score: 0,
                hits: [
                  {
                    _index: 'winlogbeat-8.0.0-2020.09.02-000001',
                    _id: 'cinEZnQBB-gskclyvNmU',
                    _score: null,
                    fields: {
                      'process.args': ['C:\\Windows\\system32\\devicecensus.exe'],
                      'process.name': ['DeviceCensus.exe'],
                      'user.name': ['SYSTEM'],
                    },
                    sort: [1599452000791],
                  },
                ],
              },
            },
            hosts: {
              doc_count_error_upper_bound: 0,
              sum_other_doc_count: 0,
              buckets: [
                {
                  key: 'siem-windows',
                  doc_count: 1,
                  host: {
                    hits: {
                      total: 1,
                      max_score: 0,
                      hits: [
                        {
                          _index: 'winlogbeat-8.0.0-2020.09.02-000001',
                          _id: 'cinEZnQBB-gskclyvNmU',
                          _score: 0,
                          fields: {
                            'process.args': ['C:\\Windows\\system32\\devicecensus.exe'],
                            'process.name': ['DeviceCensus.exe'],
                            'host.name': ['siem-windows'],
                            'user.name': ['SYSTEM'],
                            '@timestamp': '2020-09-07T04:13:20.791Z',
                          },
                        },
                      ],
                    },
                  },
                },
              ],
            },
            host_count: {
              value: 1,
            },
          },
          {
            key: 'DiskSnapshot.exe',
            doc_count: 1,
            process: {
              hits: {
                total: 1,
                max_score: 0,
                hits: [
                  {
                    _index: 'winlogbeat-8.0.0-2020.09.02-000001',
                    _id: 'HNKSZHQBA6bGZw2uCtRk',
                    _score: null,
                    fields: {
                      'process.args': ['C:\\Windows\\system32\\disksnapshot.exe', '-z'],
                      'process.name': ['DiskSnapshot.exe'],
                      'user.name': ['SYSTEM'],
                    },
                    sort: [1599415124040],
                  },
                ],
              },
            },
            hosts: {
              doc_count_error_upper_bound: 0,
              sum_other_doc_count: 0,
              buckets: [
                {
                  key: 'siem-windows',
                  doc_count: 1,
                  host: {
                    hits: {
                      total: 1,
                      max_score: 0,
                      hits: [
                        {
                          _index: 'winlogbeat-8.0.0-2020.09.02-000001',
                          _id: 'HNKSZHQBA6bGZw2uCtRk',
                          _score: 0,
                          fields: {
                            'process.args': ['C:\\Windows\\system32\\disksnapshot.exe', '-z'],
                            'process.name': ['DiskSnapshot.exe'],
                            'host.name': ['siem-windows'],
                            'user.name': ['SYSTEM'],
                            '@timestamp': '2020-09-06T17:58:44.040Z',
                          },
                        },
                      ],
                    },
                  },
                },
              ],
            },
            host_count: {
              value: 1,
            },
          },
          {
            key: 'DismHost.exe',
            doc_count: 1,
            process: {
              hits: {
                total: 1,
                max_score: 0,
                hits: [
                  {
                    _index: 'winlogbeat-8.0.0-2020.09.02-000001',
                    _id: '2zncaHQBB-gskcly1QaD',
                    _score: null,
                    fields: {
                      'process.args': [
                        'C:\\Windows\\TEMP\\88C4F57A-8744-4EA6-824E-88FEF8A0E9DD\\dismhost.exe',
                        '{6BB79B50-2038-4A10-B513-2FAC72FF213E}',
                      ],
                      'process.name': ['DismHost.exe'],
                      'user.name': ['SYSTEM'],
                    },
                    sort: [1599487135371],
                  },
                ],
              },
            },
            hosts: {
              doc_count_error_upper_bound: 0,
              sum_other_doc_count: 0,
              buckets: [
                {
                  key: 'siem-windows',
                  doc_count: 1,
                  host: {
                    hits: {
                      total: 1,
                      max_score: 0,
                      hits: [
                        {
                          _index: 'winlogbeat-8.0.0-2020.09.02-000001',
                          _id: '2zncaHQBB-gskcly1QaD',
                          _score: 0,
                          fields: {
                            'process.args': [
                              'C:\\Windows\\TEMP\\88C4F57A-8744-4EA6-824E-88FEF8A0E9DD\\dismhost.exe',
                              '{6BB79B50-2038-4A10-B513-2FAC72FF213E}',
                            ],
                            'process.name': ['DismHost.exe'],
                            'host.name': ['siem-windows'],
                            'user.name': ['SYSTEM'],
                            '@timestamp': '2020-09-07T13:58:55.371Z',
                          },
                        },
                      ],
                    },
                  },
                },
              ],
            },
            host_count: {
              value: 1,
            },
          },
          {
            key: 'SIHClient.exe',
            doc_count: 1,
            process: {
              hits: {
                total: 1,
                max_score: 0,
                hits: [
                  {
                    _index: 'winlogbeat-8.0.0-2020.09.02-000001',
                    _id: 'gdVuZXQBA6bGZw2uFsPP',
                    _score: null,
                    fields: {
                      'process.args': [
                        'C:\\Windows\\System32\\sihclient.exe',
                        '/cv',
                        '33nfV21X50ie84HvATAt1w.0.1',
                      ],
                      'process.name': ['SIHClient.exe'],
                      'user.name': ['SYSTEM'],
                    },
                    sort: [1599429545370],
                  },
                ],
              },
            },
            hosts: {
              doc_count_error_upper_bound: 0,
              sum_other_doc_count: 0,
              buckets: [
                {
                  key: 'siem-windows',
                  doc_count: 1,
                  host: {
                    hits: {
                      total: 1,
                      max_score: 0,
                      hits: [
                        {
                          _index: 'winlogbeat-8.0.0-2020.09.02-000001',
                          _id: 'gdVuZXQBA6bGZw2uFsPP',
                          _score: 0,
                          fields: {
                            'process.args': [
                              'C:\\Windows\\System32\\sihclient.exe',
                              '/cv',
                              '33nfV21X50ie84HvATAt1w.0.1',
                            ],
                            'process.name': ['SIHClient.exe'],
                            'host.name': ['siem-windows'],
                            'user.name': ['SYSTEM'],
                            '@timestamp': '2020-09-06T21:59:05.370Z',
                          },
                        },
                      ],
                    },
                  },
                },
              ],
            },
            host_count: {
              value: 1,
            },
          },
          {
            key: 'SpeechModelDownload.exe',
            doc_count: 1,
            process: {
              hits: {
                total: 1,
                max_score: 0,
                hits: [
                  {
                    _index: 'winlogbeat-8.0.0-2020.09.02-000001',
                    _id: '6NmKZnQBA6bGZw2uma12',
                    _score: null,
                    fields: {
                      'process.args': [
                        'C:\\Windows\\system32\\speech_onecore\\common\\SpeechModelDownload.exe',
                      ],
                      'process.name': ['SpeechModelDownload.exe'],
                      'user.name': ['NETWORK SERVICE'],
                    },
                    sort: [1599448191225],
                  },
                ],
              },
            },
            hosts: {
              doc_count_error_upper_bound: 0,
              sum_other_doc_count: 0,
              buckets: [
                {
                  key: 'siem-windows',
                  doc_count: 1,
                  host: {
                    hits: {
                      total: 1,
                      max_score: 0,
                      hits: [
                        {
                          _index: 'winlogbeat-8.0.0-2020.09.02-000001',
                          _id: '6NmKZnQBA6bGZw2uma12',
                          _score: 0,
                          fields: {
                            'process.args': [
                              'C:\\Windows\\system32\\speech_onecore\\common\\SpeechModelDownload.exe',
                            ],
                            'process.name': ['SpeechModelDownload.exe'],
                            'host.name': ['siem-windows'],
                            'user.name': ['NETWORK SERVICE'],
                            '@timestamp': '2020-09-07T03:09:51.225Z',
                          },
                        },
                      ],
                    },
                  },
                },
              ],
            },
            host_count: {
              value: 1,
            },
          },
          {
            key: 'UsoClient.exe',
            doc_count: 1,
            process: {
              hits: {
                total: 1,
                max_score: 0,
                hits: [
                  {
                    _index: 'winlogbeat-8.0.0-2020.09.02-000001',
                    _id: 'Pi68Z3QBc39KFIJb3txa',
                    _score: null,
                    fields: {
                      'process.args': ['C:\\Windows\\system32\\usoclient.exe', 'StartScan'],
                      'process.name': ['UsoClient.exe'],
                      'user.name': ['SYSTEM'],
                    },
                    sort: [1599468262455],
                  },
                ],
              },
            },
            hosts: {
              doc_count_error_upper_bound: 0,
              sum_other_doc_count: 0,
              buckets: [
                {
                  key: 'siem-windows',
                  doc_count: 1,
                  host: {
                    hits: {
                      total: 1,
                      max_score: 0,
                      hits: [
                        {
                          _index: 'winlogbeat-8.0.0-2020.09.02-000001',
                          _id: 'Pi68Z3QBc39KFIJb3txa',
                          _score: 0,
                          fields: {
                            'process.args': ['C:\\Windows\\system32\\usoclient.exe', 'StartScan'],
                            'process.name': ['UsoClient.exe'],
                            'host.name': ['siem-windows'],
                            'user.name': ['SYSTEM'],
                            '@timestamp': '2020-09-07T08:44:22.455Z',
                          },
                        },
                      ],
                    },
                  },
                },
              ],
            },
            host_count: {
              value: 1,
            },
          },
          {
            key: 'apt-compat',
            doc_count: 1,
            process: {
              hits: {
                total: 1,
                max_score: 0,
                hits: [
                  {
                    _index: '.ds-logs-endpoint.events.process-default-000001',
                    _id: 'Ziw-Z3QBB-gskcly0vqU',
                    _score: null,
                    fields: {
                      'process.args': ['/etc/cron.daily/apt-compat'],
                      'process.name': ['apt-compat'],
                      'user.name': ['root'],
                      'user.id': [0],
                    },
                    sort: [1599459901154],
                  },
                ],
              },
            },
            hosts: {
              doc_count_error_upper_bound: 0,
              sum_other_doc_count: 0,
              buckets: [
                {
                  key: 'siem-kibana',
                  doc_count: 1,
                  host: {
                    hits: {
                      total: 1,
                      max_score: 0,
                      hits: [
                        {
                          _index: '.ds-logs-endpoint.events.process-default-000001',
                          _id: 'Ziw-Z3QBB-gskcly0vqU',
                          _score: 0,
                          fields: {
                            'process.args': ['/etc/cron.daily/apt-compat'],
                            'process.name': ['apt-compat'],
                            'host.name': ['siem-kibana'],
                            'user.name': ['root'],
                            'user.id': [0],
                            '@timestamp': '2020-09-07T06:25:01.154464000Z',
                          },
                        },
                      ],
                    },
                  },
                },
              ],
            },
            host_count: {
              value: 1,
            },
          },
          {
            key: 'bsdmainutils',
            doc_count: 1,
            process: {
              hits: {
                total: 1,
                max_score: 0,
                hits: [
                  {
                    _index: '.ds-logs-endpoint.events.process-default-000001',
                    _id: 'aSw-Z3QBB-gskcly0vqU',
                    _score: null,
                    fields: {
                      'process.args': ['/etc/cron.daily/bsdmainutils'],
                      'process.name': ['bsdmainutils'],
                      'user.name': ['root'],
                      'user.id': [0],
                    },
                    sort: [1599459901155],
                  },
                ],
              },
            },
            hosts: {
              doc_count_error_upper_bound: 0,
              sum_other_doc_count: 0,
              buckets: [
                {
                  key: 'siem-kibana',
                  doc_count: 1,
                  host: {
                    hits: {
                      total: 1,
                      max_score: 0,
                      hits: [
                        {
                          _index: '.ds-logs-endpoint.events.process-default-000001',
                          _id: 'aSw-Z3QBB-gskcly0vqU',
                          _score: 0,
                          fields: {
                            'process.args': ['/etc/cron.daily/bsdmainutils'],
                            'process.name': ['bsdmainutils'],
                            'host.name': ['siem-kibana'],
                            'user.name': ['root'],
                            'user.id': [0],
                            '@timestamp': '2020-09-07T06:25:01.155812000Z',
                          },
                        },
                      ],
                    },
                  },
                },
              ],
            },
            host_count: {
              value: 1,
            },
          },
        ],
      },
    },
  },
  total: 21,
  loaded: 21,
  edges: [
    {
      node: {
        _id: 'ayrMZnQBB-gskcly0w7l',
        instances: 1,
        process: {
          args: [
            'C:\\Windows\\SoftwareDistribution\\Download\\Install\\AM_Delta_Patch_1.323.631.0.exe',
            'WD',
            '/q',
          ],
          name: ['AM_Delta_Patch_1.323.631.0.exe'],
        },
        hosts: [
          {
            id: ['siem-windows'],
            name: ['siem-windows'],
          },
        ],
        user: {
          name: ['SYSTEM'],
        },
      },
      cursor: {
        value: '',
        tiebreaker: null,
      },
    },
    {
      node: {
        _id: 'M-GvaHQBA6bGZw2uBoYz',
        instances: 1,
        process: {
          args: [
            'C:\\Windows\\SoftwareDistribution\\Download\\Install\\AM_Delta_Patch_1.323.673.0.exe',
            'WD',
            '/q',
          ],
          name: ['AM_Delta_Patch_1.323.673.0.exe'],
        },
        hosts: [
          {
            id: ['siem-windows'],
            name: ['siem-windows'],
          },
        ],
        user: {
          name: ['SYSTEM'],
        },
      },
      cursor: {
        value: '',
        tiebreaker: null,
      },
    },
    {
      node: {
        _id: 'cinEZnQBB-gskclyvNmU',
        instances: 1,
        process: {
          args: ['C:\\Windows\\system32\\devicecensus.exe'],
          name: ['DeviceCensus.exe'],
        },
        hosts: [
          {
            id: ['siem-windows'],
            name: ['siem-windows'],
          },
        ],
        user: {
          name: ['SYSTEM'],
        },
      },
      cursor: {
        value: '',
        tiebreaker: null,
      },
    },
    {
      node: {
        _id: 'HNKSZHQBA6bGZw2uCtRk',
        instances: 1,
        process: {
          args: ['C:\\Windows\\system32\\disksnapshot.exe', '-z'],
          name: ['DiskSnapshot.exe'],
        },
        hosts: [
          {
            id: ['siem-windows'],
            name: ['siem-windows'],
          },
        ],
        user: {
          name: ['SYSTEM'],
        },
      },
      cursor: {
        value: '',
        tiebreaker: null,
      },
    },
    {
      node: {
        _id: '2zncaHQBB-gskcly1QaD',
        instances: 1,
        process: {
          args: [
            'C:\\Windows\\TEMP\\88C4F57A-8744-4EA6-824E-88FEF8A0E9DD\\dismhost.exe',
            '{6BB79B50-2038-4A10-B513-2FAC72FF213E}',
          ],
          name: ['DismHost.exe'],
        },
        hosts: [
          {
            id: ['siem-windows'],
            name: ['siem-windows'],
          },
        ],
        user: {
          name: ['SYSTEM'],
        },
      },
      cursor: {
        value: '',
        tiebreaker: null,
      },
    },
    {
      node: {
        _id: 'gdVuZXQBA6bGZw2uFsPP',
        instances: 1,
        process: {
          args: ['C:\\Windows\\System32\\sihclient.exe', '/cv', '33nfV21X50ie84HvATAt1w.0.1'],
          name: ['SIHClient.exe'],
        },
        hosts: [
          {
            id: ['siem-windows'],
            name: ['siem-windows'],
          },
        ],
        user: {
          name: ['SYSTEM'],
        },
      },
      cursor: {
        value: '',
        tiebreaker: null,
      },
    },
    {
      node: {
        _id: '6NmKZnQBA6bGZw2uma12',
        instances: 1,
        process: {
          args: ['C:\\Windows\\system32\\speech_onecore\\common\\SpeechModelDownload.exe'],
          name: ['SpeechModelDownload.exe'],
        },
        hosts: [
          {
            id: ['siem-windows'],
            name: ['siem-windows'],
          },
        ],
        user: {
          name: ['NETWORK SERVICE'],
        },
      },
      cursor: {
        value: '',
        tiebreaker: null,
      },
    },
    {
      node: {
        _id: 'Pi68Z3QBc39KFIJb3txa',
        instances: 1,
        process: {
          args: ['C:\\Windows\\system32\\usoclient.exe', 'StartScan'],
          name: ['UsoClient.exe'],
        },
        hosts: [
          {
            id: ['siem-windows'],
            name: ['siem-windows'],
          },
        ],
        user: {
          name: ['SYSTEM'],
        },
      },
      cursor: {
        value: '',
        tiebreaker: null,
      },
    },
    {
      node: {
        _id: 'Ziw-Z3QBB-gskcly0vqU',
        instances: 1,
        process: {
          args: ['/etc/cron.daily/apt-compat'],
          name: ['apt-compat'],
        },
        hosts: [
          {
            id: ['siem-kibana'],
            name: ['siem-kibana'],
          },
        ],
        user: {
          id: ['0'],
          name: ['root'],
        },
      },
      cursor: {
        value: '',
        tiebreaker: null,
      },
    },
    {
      node: {
        _id: 'aSw-Z3QBB-gskcly0vqU',
        instances: 1,
        process: {
          args: ['/etc/cron.daily/bsdmainutils'],
          name: ['bsdmainutils'],
        },
        hosts: [
          {
            id: ['siem-kibana'],
            name: ['siem-kibana'],
          },
        ],
        user: {
          id: ['0'],
          name: ['root'],
        },
      },
      cursor: {
        value: '',
        tiebreaker: null,
      },
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
              process_count: { cardinality: { field: 'process.name' } },
              group_by_process: {
                terms: {
                  size: 10,
                  field: 'process.name',
                  order: [{ host_count: 'asc' }, { _count: 'asc' }, { _key: 'asc' }],
                },
                aggregations: {
                  process: {
                    top_hits: {
                      size: 1,
                      sort: [{ '@timestamp': { order: 'desc' } }],
                      _source: false,
                      fields: [
                        'process.args',
                        'process.name',
                        'user.id',
                        'user.name',
                        {
                          field: '@timestamp',
                          format: 'strict_date_optional_time',
                        },
                      ],
                    },
                  },
                  host_count: { cardinality: { field: 'host.name' } },
                  hosts: {
                    terms: { field: 'host.name' },
                    aggregations: {
                      host: {
                        top_hits: {
                          size: 1,
                          _source: false,
                          fields: [
                            'host.name',
                            {
                              field: '@timestamp',
                              format: 'strict_date_optional_time',
                            },
                          ],
                        },
                      },
                    },
                  },
                },
              },
            },
            query: {
              bool: {
                should: [
                  {
                    bool: {
                      filter: [
                        { term: { 'agent.type': 'auditbeat' } },
                        { term: { 'event.module': 'auditd' } },
                        { term: { 'event.action': 'executed' } },
                      ],
                    },
                  },
                  {
                    bool: {
                      filter: [
                        { term: { 'agent.type': 'auditbeat' } },
                        { term: { 'event.module': 'system' } },
                        { term: { 'event.dataset': 'process' } },
                        { term: { 'event.action': 'process_started' } },
                      ],
                    },
                  },
                  {
                    bool: {
                      filter: [
                        { term: { 'agent.type': 'winlogbeat' } },
                        { term: { 'event.code': '4688' } },
                      ],
                    },
                  },
                  {
                    bool: {
                      filter: [
                        { term: { 'winlog.event_id': 1 } },
                        { term: { 'winlog.channel': 'Microsoft-Windows-Sysmon/Operational' } },
                      ],
                    },
                  },
                  {
                    bool: {
                      filter: [
                        { term: { 'event.type': 'process_start' } },
                        { term: { 'event.category': 'process' } },
                      ],
                    },
                  },
                  {
                    bool: {
                      filter: [
                        { term: { 'event.category': 'process' } },
                        { term: { 'event.type': 'start' } },
                      ],
                    },
                  },
                ],
                minimum_should_match: 1,
                filter: [
                  {
                    bool: {
                      must: [],
                      filter: [
                        { match_all: {} },
                        { match_phrase: { 'host.name': { query: 'siem-kibana' } } },
                      ],
                      should: [],
                      must_not: [],
                    },
                  },
                  {
                    range: {
                      '@timestamp': {
                        gte: '2020-09-06T15:23:52.757Z',
                        lte: '2020-09-07T15:23:52.757Z',
                        format: 'strict_date_optional_time',
                      },
                    },
                  },
                ],
              },
            },
            _source: false,
          },
          size: 0,
          track_total_hits: false,
        },
        null,
        2
      ),
    ],
  },
  pageInfo: {
    activePage: 0,
    fakeTotalCount: 50,
    showMorePagesIndicator: true,
  },
  totalCount: 92,
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
      process_count: { cardinality: { field: 'process.name' } },
      group_by_process: {
        terms: {
          size: 10,
          field: 'process.name',
          order: [{ host_count: 'asc' }, { _count: 'asc' }, { _key: 'asc' }],
        },
        aggregations: {
          process: {
            top_hits: {
              size: 1,
              sort: [{ '@timestamp': { order: 'desc' } }],
              _source: false,
              fields: [
                'process.args',
                'process.name',
                'user.id',
                'user.name',
                {
                  field: '@timestamp',
                  format: 'strict_date_optional_time',
                },
              ],
            },
          },
          host_count: { cardinality: { field: 'host.name' } },
          hosts: {
            terms: { field: 'host.name' },
            aggregations: {
              host: {
                top_hits: {
                  size: 1,
                  _source: false,
                  fields: [
                    'host.name',
                    {
                      field: '@timestamp',
                      format: 'strict_date_optional_time',
                    },
                  ],
                },
              },
            },
          },
        },
      },
    },
    query: {
      bool: {
        should: [
          {
            bool: {
              filter: [
                { term: { 'agent.type': 'auditbeat' } },
                { term: { 'event.module': 'auditd' } },
                { term: { 'event.action': 'executed' } },
              ],
            },
          },
          {
            bool: {
              filter: [
                { term: { 'agent.type': 'auditbeat' } },
                { term: { 'event.module': 'system' } },
                { term: { 'event.dataset': 'process' } },
                { term: { 'event.action': 'process_started' } },
              ],
            },
          },
          {
            bool: {
              filter: [
                { term: { 'agent.type': 'winlogbeat' } },
                { term: { 'event.code': '4688' } },
              ],
            },
          },
          {
            bool: {
              filter: [
                { term: { 'winlog.event_id': 1 } },
                { term: { 'winlog.channel': 'Microsoft-Windows-Sysmon/Operational' } },
              ],
            },
          },
          {
            bool: {
              filter: [
                { term: { 'event.type': 'process_start' } },
                { term: { 'event.category': 'process' } },
              ],
            },
          },
          {
            bool: {
              filter: [
                { term: { 'event.category': 'process' } },
                { term: { 'event.type': 'start' } },
              ],
            },
          },
        ],
        minimum_should_match: 1,
        filter: [
          {
            bool: {
              must: [],
              filter: [
                { match_all: {} },
                { match_phrase: { 'host.name': { query: 'siem-kibana' } } },
              ],
              should: [],
              must_not: [],
            },
          },
          {
            range: {
              '@timestamp': {
                gte: '2020-09-06T15:23:52.757Z',
                lte: '2020-09-07T15:23:52.757Z',
                format: 'strict_date_optional_time',
              },
            },
          },
        ],
      },
    },
    _source: false,
  },
  size: 0,
  track_total_hits: false,
};
