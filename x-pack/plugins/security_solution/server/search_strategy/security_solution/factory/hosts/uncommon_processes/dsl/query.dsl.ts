/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type * as estypes from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import { hostFieldsMap, processFieldsMap, userFieldsMap } from '@kbn/securitysolution-ecs';
import { createQueryFilterClauses } from '../../../../../../utils/build_query';
import { reduceFields } from '../../../../../../utils/build_query/reduce_fields';
import type { RequestOptionsPaginated } from '../../../../../../../common/search_strategy/security_solution';
import { UNCOMMON_PROCESSES_FIELDS } from '../helpers';

export const buildQuery = ({
  defaultIndex,
  filterQuery,
  pagination: { querySize },
  timerange: { from, to },
}: RequestOptionsPaginated) => {
  const processUserFields = reduceFields(UNCOMMON_PROCESSES_FIELDS, {
    ...processFieldsMap,
    ...userFieldsMap,
  }) as string[];
  const hostFields = reduceFields(UNCOMMON_PROCESSES_FIELDS, hostFieldsMap) as string[];
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

  const agg = {
    process_count: {
      cardinality: {
        field: 'process.name',
      },
    },
  };

  const dslQuery = {
    allow_no_indices: true,
    index: defaultIndex,
    ignore_unavailable: true,
    body: {
      aggregations: {
        ...agg,
        group_by_process: {
          terms: {
            size: querySize,
            field: 'process.name',
            order: [
              {
                host_count: 'asc' as const,
              },
              {
                _count: 'asc' as const,
              },
              {
                _key: 'asc' as const,
              },
            ] as estypes.AggregationsAggregateOrder,
          },
          aggregations: {
            process: {
              top_hits: {
                size: 1,
                sort: [{ '@timestamp': { order: 'desc' as const } }],
                _source: false,
                fields: [
                  ...processUserFields,
                  {
                    field: '@timestamp',
                    format: 'strict_date_optional_time',
                  },
                ],
              },
            },
            host_count: {
              cardinality: {
                field: 'host.name',
              },
            },
            hosts: {
              terms: {
                field: 'host.name',
              },
              aggregations: {
                host: {
                  top_hits: {
                    size: 1,
                    _source: false,
                    fields: [
                      ...hostFields,
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
                  {
                    term: {
                      'agent.type': 'auditbeat',
                    },
                  },
                  {
                    term: {
                      'event.module': 'auditd',
                    },
                  },
                  {
                    term: {
                      'event.action': 'executed',
                    },
                  },
                ] as estypes.QueryDslQueryContainer[],
              },
            },
            {
              bool: {
                filter: [
                  {
                    term: {
                      'agent.type': 'auditbeat',
                    },
                  },
                  {
                    term: {
                      'event.module': 'system',
                    },
                  },
                  {
                    term: {
                      'event.dataset': 'process',
                    },
                  },
                  {
                    term: {
                      'event.action': 'process_started',
                    },
                  },
                ] as estypes.QueryDslQueryContainer[],
              },
            },
            {
              bool: {
                filter: [
                  {
                    term: {
                      'agent.type': 'winlogbeat',
                    },
                  },
                  {
                    term: {
                      'event.code': '4688',
                    },
                  },
                ],
              },
            },
            {
              bool: {
                filter: [
                  {
                    term: {
                      'winlog.event_id': 1,
                    },
                  },
                  {
                    term: {
                      'winlog.channel': 'Microsoft-Windows-Sysmon/Operational',
                    },
                  },
                ],
              },
            },
            {
              bool: {
                filter: [
                  {
                    term: {
                      'event.type': 'process_start',
                    },
                  },
                  {
                    term: {
                      'event.category': 'process',
                    },
                  },
                ],
              },
            },
            {
              bool: {
                filter: [
                  {
                    term: {
                      'event.category': 'process',
                    },
                  },
                  {
                    term: {
                      'event.type': 'start',
                    },
                  },
                ],
              },
            },
          ],
          minimum_should_match: 1,
          filter,
        },
      },
      _source: false,
    },
    size: 0,
    track_total_hits: false,
  };

  return dslQuery;
};
