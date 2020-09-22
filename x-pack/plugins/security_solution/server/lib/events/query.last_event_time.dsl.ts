/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { isEmpty } from 'lodash/fp';

import { assertUnreachable } from '../../../common/utility_types';
import { LastEventTimeRequestOptions } from './types';
import { LastEventIndexKey } from '../../graphql/types';

interface EventIndices {
  [key: string]: string[];
}

export const buildLastEventTimeQuery = ({
  indexKey,
  details,
  defaultIndex,
  docValueFields,
}: LastEventTimeRequestOptions) => {
  const indicesToQuery: EventIndices = {
    hosts: defaultIndex,
    network: defaultIndex,
  };
  const getHostDetailsFilter = (hostName: string) => [{ term: { 'host.name': hostName } }];
  const getIpDetailsFilter = (ip: string) => [
    { term: { 'source.ip': ip } },
    { term: { 'destination.ip': ip } },
  ];
  const getQuery = (eventIndexKey: LastEventIndexKey) => {
    switch (eventIndexKey) {
      case LastEventIndexKey.ipDetails:
        if (details.ip) {
          return {
            allowNoIndices: true,
            index: indicesToQuery.network,
            ignoreUnavailable: true,
            body: {
              ...(isEmpty(docValueFields) ? { docvalue_fields: docValueFields } : {}),
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
      case LastEventIndexKey.hostDetails:
        if (details.hostName) {
          return {
            allowNoIndices: true,
            index: indicesToQuery.hosts,
            ignoreUnavailable: true,
            body: {
              ...(isEmpty(docValueFields) ? { docvalue_fields: docValueFields } : {}),
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
      case LastEventIndexKey.hosts:
      case LastEventIndexKey.network:
        return {
          allowNoIndices: true,
          index: indicesToQuery[indexKey],
          ignoreUnavailable: true,
          body: {
            ...(isEmpty(docValueFields) ? { docvalue_fields: docValueFields } : {}),
            aggregations: {
              last_seen_event: { max: { field: '@timestamp' } },
            },
            query: { match_all: {} },
            size: 0,
            track_total_hits: false,
          },
        };
      default:
        return assertUnreachable(eventIndexKey);
    }
  };
  return getQuery(indexKey);
};
