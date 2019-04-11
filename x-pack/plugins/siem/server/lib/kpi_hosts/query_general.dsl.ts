/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { createQueryFilterClauses } from '../../utils/build_query';
import { RequestBasicOptions } from '../framework';

import { KpiHostsESMSearchBody } from './types';

export const buildGeneralQuery = ({
  filterQuery,
  timerange: { from, to },
  sourceConfiguration: {
    fields: { timestamp },
    logAlias,
    auditbeatAlias,
    packetbeatAlias,
    winlogbeatAlias,
  },
}: RequestBasicOptions): KpiHostsESMSearchBody[] => {
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

  const dslQuery = [
    {
      index: [logAlias, auditbeatAlias, packetbeatAlias, winlogbeatAlias],
      allowNoIndices: true,
      ignoreUnavailable: true,
    },
    {
      aggregations: {
        host: {
          cardinality: {
            field: 'host.name',
          },
        },
        installedPackages: {
          cardinality: {
            field: 'system.audit.package.entity_id',
          },
        },
        sockets: {
          cardinality: {
            field: 'socket.entity_id',
          },
        },
        unique_source_ips: {
          cardinality: {
            field: 'source.ip',
          },
        },
        unique_destination_ips: {
          cardinality: {
            field: 'destination.ip',
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
  ];

  return dslQuery;
};
