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
  details,
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
  };
  const getHostDetailsFilter = (hostName: string) => [{ term: { 'host.name': hostName } }];
  const getIpDetailsFilter = (ip: string) => [{ term: { 'source.ip': ip } }, { term: { 'destination.ip': ip } }];
  switch (indexKey) {
    case 'ipDetails':
      if (details.ip) {
        return {
          allowNoIndices: true,
          index: indicesToQuery.network,
          ignoreUnavailable: true,
          body: {
            aggregations: {
              last_seen_event: { max: { field: '@timestamp' } },
            },
            query: { bool: { should: getIpDetailsFilter(details.ip) } },
            size: 0,
            track_total_hits: false,
          },
        };
      }
      throw new Error('buildLastEventTimeQuery - no IP argument provided');
    case 'hostDetails':
      if (details.hostName) {
        return {
          allowNoIndices: true,
          index: indicesToQuery.hosts,
          ignoreUnavailable: true,
          body: {
            aggregations: {
              last_seen_event: { max: { field: '@timestamp' } },
            },
            query: { bool: { filter: getHostDetailsFilter(details.hostName) } },
            size: 0,
            track_total_hits: false,
          },
        };
      }
      throw new Error('buildLastEventTimeQuery - no hostName argument provided');
    case 'hosts':
    case 'network':
      return {
        allowNoIndices: true,
        index: indicesToQuery[indexKey],
        ignoreUnavailable: true,
        body: {
          aggregations: {
            last_seen_event: { max: { field: '@timestamp' } },
          },
          query: { match_all: {} },
          size: 0,
          track_total_hits: false,
        },
      };
  }
  throw new Error('buildLastEventTimeQuery - invalid indexKey');
};
