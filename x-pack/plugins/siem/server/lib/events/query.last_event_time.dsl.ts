/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { LastEventTimeRequestOptions } from './types';

interface EventIndicies {
  [key: string]: string[];
}

export const buildLastEventTimeQuery = ({
  indexKey,
  sourceConfiguration: {
    fields: { timestamp },
    logAlias,
    auditbeatAlias,
    packetbeatAlias,
    winlogbeatAlias,
  },
}: LastEventTimeRequestOptions) => {
  const indicesToQuery: EventIndicies = {
    hosts: [logAlias, auditbeatAlias, packetbeatAlias, winlogbeatAlias],
    network: [logAlias, packetbeatAlias],
  }
  const dslQuery = {
    allowNoIndices: true,
    index: indicesToQuery[indexKey],
    ignoreUnavailable: true,
    body: {
      aggregations: {
        last_seen_event: {
          max: {
            field: '@timestamp',
          },
        },
      },
      query: { match_all: {} },
      size: 0,
      track_total_hits: false,
    },
  };

  return dslQuery;
};
