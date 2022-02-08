/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isEmpty } from 'lodash/fp';
import type { ISearchRequestParams } from 'src/plugins/data/common';
import {
  TimelineEventsLastEventTimeRequestOptions,
  LastEventIndexKey,
} from '../../../../../../common/search_strategy';

import { assertUnreachable } from '../../../../../../common/utility_types';

interface EventIndices {
  [key: string]: string[];
}

export const buildLastEventTimeQuery = ({
  indexKey,
  details,
  defaultIndex,
  docValueFields,
}: TimelineEventsLastEventTimeRequestOptions) => {
  const indicesToQuery: EventIndices = {
    hosts: defaultIndex,
    network: defaultIndex,
  };
  const getUserDetailsFilter = (userName: string) => [{ term: { 'user.name': userName } }];
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
            allow_no_indices: true,
            index: indicesToQuery.network,
            ignore_unavailable: true,
            track_total_hits: false,
            body: {
              ...(!isEmpty(docValueFields) ? { docvalue_fields: docValueFields } : {}),
              query: { bool: { filter: { bool: { should: getIpDetailsFilter(details.ip) } } } },
              _source: ['@timestamp'],
              size: 1,
              sort: [
                {
                  '@timestamp': {
                    order: 'desc',
                  },
                },
              ],
            },
          };
        }
        throw new Error('buildLastEventTimeQuery - no IP argument provided');
      case LastEventIndexKey.hostDetails:
        if (details.hostName) {
          return {
            allow_no_indices: true,
            index: indicesToQuery.hosts,
            ignore_unavailable: true,
            track_total_hits: false,
            body: {
              ...(!isEmpty(docValueFields) ? { docvalue_fields: docValueFields } : {}),
              query: { bool: { filter: getHostDetailsFilter(details.hostName) } },
              _source: ['@timestamp'],
              size: 1,
              sort: [
                {
                  '@timestamp': {
                    order: 'desc',
                  },
                },
              ],
            },
          };
        }
        throw new Error('buildLastEventTimeQuery - no hostName argument provided');
      case LastEventIndexKey.userDetails:
        if (details.userName) {
          return {
            allow_no_indices: true,
            index: indicesToQuery.hosts,
            ignore_unavailable: true,
            track_total_hits: false,
            body: {
              ...(!isEmpty(docValueFields) ? { docvalue_fields: docValueFields } : {}),
              query: { bool: { filter: getUserDetailsFilter(details.userName) } },
              _source: ['@timestamp'],
              size: 1,
              sort: [
                {
                  '@timestamp': {
                    order: 'desc',
                  },
                },
              ],
            },
          };
        }
        throw new Error('buildLastEventTimeQuery - no userName argument provided');
      case LastEventIndexKey.hosts:
      case LastEventIndexKey.network:
      case LastEventIndexKey.users:
        return {
          allow_no_indices: true,
          index: indicesToQuery[indexKey],
          ignore_unavailable: true,
          track_total_hits: false,
          body: {
            ...(!isEmpty(docValueFields) ? { docvalue_fields: docValueFields } : {}),
            query: { match_all: {} },
            _source: ['@timestamp'],
            size: 1,
            sort: [
              {
                '@timestamp': {
                  order: 'desc',
                },
              },
            ],
          },
        };
      default:
        return assertUnreachable(eventIndexKey);
    }
  };
  // TODO: Yes, TypeScript defeated me. Need to remove this type
  // cast, typing issue seemed to have slipped into codebase previously
  return getQuery(indexKey) as ISearchRequestParams;
};
