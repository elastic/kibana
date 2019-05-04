/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { reduceFields } from '../../utils/build_query/reduce_fields';
import { hostFieldsMap } from '../ecs_fields';

import { buildFieldsTermAggregation } from './helpers';
import { HostDetailsRequestOptions } from './types';

export const buildHostDetailsQuery = ({
  fields,
  hostName,
  sourceConfiguration: {
    fields: { timestamp },
    logAlias,
    auditbeatAlias,
    packetbeatAlias,
    winlogbeatAlias,
  },
  timerange: { from, to },
}: HostDetailsRequestOptions) => {
  const esFields = reduceFields(fields, hostFieldsMap);

  const filter = [
    { term: { 'host.name': hostName } },
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
    index: [logAlias, auditbeatAlias, packetbeatAlias, winlogbeatAlias],
    ignoreUnavailable: true,
    body: {
      aggregations: {
        lastSeen: { max: { field: '@timestamp' } },
        ...buildFieldsTermAggregation(esFields.filter(field => !['@timestamp'].includes(field))),
      },
      query: { bool: { filter } },
      size: 0,
      track_total_hits: false,
    },
  };

  return dslQuery;
};
