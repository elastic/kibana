/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { createQueryFilterClauses } from '../../utils/build_query';
import { RequestBasicOptions } from '../framework';

export const buildOverviewNetworkQuery = ({
  filterQuery,
  timerange: { from, to },
  sourceConfiguration: {
    fields: { timestamp },
    auditbeatAlias,
    logAlias,
    packetbeatAlias,
    winlogbeatAlias,
  },
}: RequestBasicOptions) => {
  const filter = [
    ...createQueryFilterClauses(filterQuery),
    {
      range: {
        [timestamp]: {
          gte: from,
          lte: to,
        },
      },
    },
  ];

  const dslQuery = {
    allowNoIndices: true,
    index: [auditbeatAlias, logAlias, packetbeatAlias, winlogbeatAlias],
    ignoreUnavailable: true,
    body: {
      aggregations: {
        unique_flow_count: {
          filter: {
            term: { type: 'flow' },
          },
        },
        unique_dns_count: {
          filter: {
            term: { type: 'dns' },
          },
        },
        unique_suricata_count: {
          filter: {
            term: { 'service.type': 'suricata' },
          },
        },
        unique_zeek_count: {
          filter: {
            term: { 'service.type': 'zeek' },
          },
        },
        unique_socket_count: {
          filter: {
            term: { 'event.dataset': 'socket' },
          },
        },
      },
      query: {
        bool: {
          filter,
        },
      },
      size: 0,
      track_total_hits: true,
    },
  };

  return dslQuery;
};

export const buildOverviewHostQuery = ({
  filterQuery,
  timerange: { from, to },
  sourceConfiguration: {
    fields: { timestamp },
    auditbeatAlias,
    logAlias,
    packetbeatAlias,
  },
}: RequestBasicOptions) => {
  const filter = [
    ...createQueryFilterClauses(filterQuery),
    {
      range: {
        [timestamp]: {
          gte: from,
          lte: to,
        },
      },
    },
  ];

  const dslQuery = {
    allowNoIndices: true,
    index: [auditbeatAlias],
    ignoreUnavailable: true,
    body: {
      aggregations: {
        auditd_count: {
          filter: {
            term: {
              'event.module': 'auditd',
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
          },
        },
      },
      query: {
        bool: {
          filter,
        },
      },
      size: 0,
      track_total_hits: true,
    },
  };

  return dslQuery;
};
