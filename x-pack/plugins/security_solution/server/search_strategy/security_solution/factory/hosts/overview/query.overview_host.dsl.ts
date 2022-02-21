/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createQueryFilterClauses } from '../../../../../utils/build_query';
import type { ISearchRequestParams } from '../../../../../../../../../src/plugins/data/common';
import { HostOverviewRequestOptions } from '../../../../../../common/search_strategy/security_solution/hosts';

export const buildOverviewHostQuery = ({
  filterQuery,
  timerange: { from, to },
  defaultIndex,
}: HostOverviewRequestOptions): ISearchRequestParams => {
  const filter = [
    ...createQueryFilterClauses(filterQuery),
    {
      range: {
        '@timestamp': {
          gte: from,
          lte: to,
          format: 'strict_date_optional_time',
        },
      },
    },
  ];

  const dslQuery = {
    allow_no_indices: true,
    index: defaultIndex,
    ignore_unavailable: true,
    track_total_hits: false,
    body: {
      aggregations: {
        auditd_count: {
          filter: {
            term: {
              'event.module': 'auditd',
            },
          },
        },
        endgame_module: {
          filter: {
            bool: {
              should: [
                {
                  term: { 'event.module': 'endpoint' },
                },
                {
                  term: {
                    'event.module': 'endgame',
                  },
                },
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
                    {
                      term: {
                        'endgame.event_type_full': 'dns_event',
                      },
                    },
                  ],
                },
              },
            },
            file_event_count: {
              filter: {
                bool: {
                  should: [
                    {
                      term: {
                        'event.category': 'file',
                      },
                    },
                    {
                      term: {
                        'endgame.event_type_full': 'file_event',
                      },
                    },
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
                          {
                            term: {
                              'event.category': 'library',
                            },
                          },
                          {
                            term: {
                              'event.category': 'driver',
                            },
                          },
                        ],
                      },
                    },
                    {
                      term: {
                        'endgame.event_type_full': 'image_load_event',
                      },
                    },
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
                          {
                            bool: {
                              must_not: {
                                term: { 'network.protocol': 'dns' },
                              },
                            },
                          },
                          {
                            term: { 'event.category': 'network' },
                          },
                        ],
                      },
                    },
                    {
                      term: {
                        'endgame.event_type_full': 'network_event',
                      },
                    },
                  ],
                },
              },
            },
            process_event_count: {
              filter: {
                bool: {
                  should: [
                    {
                      term: { 'event.category': 'process' },
                    },
                    {
                      term: {
                        'endgame.event_type_full': 'process_event',
                      },
                    },
                  ],
                },
              },
            },
            registry_event: {
              filter: {
                bool: {
                  should: [
                    {
                      term: { 'event.category': 'registry' },
                    },
                    {
                      term: {
                        'endgame.event_type_full': 'registry_event',
                      },
                    },
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
                    {
                      term: {
                        'endgame.event_type_full': 'security_event',
                      },
                    },
                  ],
                },
              },
            },
          },
        },
        fim_count: {
          filter: {
            term: {
              'event.module': 'file_integrity',
            },
          },
        },
        winlog_module: {
          filter: {
            term: {
              'agent.type': 'winlogbeat',
            },
          },
          aggs: {
            mwsysmon_operational_event_count: {
              filter: {
                term: {
                  'winlog.channel': 'Microsoft-Windows-Sysmon/Operational',
                },
              },
            },
            security_event_count: {
              filter: {
                term: {
                  'winlog.channel': 'Security',
                },
              },
            },
          },
        },
        system_module: {
          filter: {
            term: {
              'event.module': 'system',
            },
          },
          aggs: {
            login_count: {
              filter: {
                term: {
                  'event.dataset': 'login',
                },
              },
            },
            package_count: {
              filter: {
                term: {
                  'event.dataset': 'package',
                },
              },
            },
            process_count: {
              filter: {
                term: {
                  'event.dataset': 'process',
                },
              },
            },
            user_count: {
              filter: {
                term: {
                  'event.dataset': 'user',
                },
              },
            },
            filebeat_count: {
              filter: {
                term: {
                  'agent.type': 'filebeat',
                },
              },
            },
          },
        },
      },
      query: {
        bool: {
          filter,
        },
      },
      size: 0,
    },
  } as const;

  // @ts-expect-error @elastic-elasticsearch readonly [] is not assignable to mutable QueryDslQueryContainer[]
  return dslQuery;
};
