/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { noop } from 'lodash/fp';
import { timelineQuery } from '../../../timelines/containers/index.gql_query';

export const mockEventViewerResponse = [
  {
    request: {
      query: timelineQuery,
      fetchPolicy: 'network-only',
      notifyOnNetworkStatusChange: true,
      variables: {
        fieldRequested: [
          '@timestamp',
          'message',
          'host.name',
          'event.module',
          'event.dataset',
          'event.action',
          'user.name',
          'source.ip',
          'destination.ip',
        ],
        filterQuery:
          '{"bool":{"must":[],"filter":[{"bool":{"filter":[{"bool":{"should":[{"range":{"@timestamp":{"gte":"2019-08-26T22:10:56.791Z"}}}],"minimum_should_match":1}},{"bool":{"should":[{"range":{"@timestamp":{"lte":"2019-08-27T22:10:56.794Z"}}}],"minimum_should_match":1}}]}}],"should":[],"must_not":[]}}',
        sourceId: 'default',
        pagination: { limit: 25, cursor: null, tiebreaker: null },
        sortField: { sortFieldId: '@timestamp', direction: 'desc' },
        defaultIndex: ['filebeat-*', 'auditbeat-*', 'packetbeat-*'],
        inspect: false,
      },
    },
    result: {
      loading: false,
      fetchMore: noop,
      refetch: noop,
      data: {
        source: {
          id: 'default',
          Timeline: {
            totalCount: 12,
            pageInfo: {
              endCursor: null,
              hasNextPage: true,
              __typename: 'PageInfo',
            },
            edges: [],
            __typename: 'TimelineData',
          },
          __typename: 'Source',
        },
      },
    },
  },
];
