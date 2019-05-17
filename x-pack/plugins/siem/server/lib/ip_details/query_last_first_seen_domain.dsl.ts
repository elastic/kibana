/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { DomainFirstLastSeenRequestOptions } from './types';

export const buildFirstLastSeenDomainQuery = ({
  ip,
  domainName,
  flowTarget,
  sourceConfiguration: {
    fields: { timestamp },
    logAlias,
    auditbeatAlias,
    packetbeatAlias,
    winlogbeatAlias,
  },
}: DomainFirstLastSeenRequestOptions) => {
  const filter = [
    { term: { [`${flowTarget}.ip`]: ip } },
    { term: { [`${flowTarget}.domain`]: domainName } },
  ];

  const dslQuery = {
    allowNoIndices: true,
    index: [logAlias, auditbeatAlias, packetbeatAlias, winlogbeatAlias],
    ignoreUnavailable: true,
    body: {
      aggregations: {
        firstSeen: { min: { field: '@timestamp' } },
        lastSeen: { max: { field: '@timestamp' } },
      },
      query: { bool: { filter } },
      size: 0,
      track_total_hits: true,
    },
  };

  return dslQuery;
};
