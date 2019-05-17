/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { graphql } from 'graphql';
import { addMockFunctionsToSchema, makeExecutableSchema } from 'graphql-tools';

import { rootSchema } from '../../../common/graphql/root/schema.gql';
import { sharedSchema } from '../../../common/graphql/shared';
import { Logger } from '../../utils/logger';
import { ecsSchema } from '../ecs';
import { dateSchema } from '../scalar_date';
import { toBooleanSchema } from '../scalar_to_boolean_array';
import { toDateSchema } from '../scalar_to_date_array';
import { toNumberSchema } from '../scalar_to_number_array';
import { sourceStatusSchema } from '../source_status/schema.gql';
import { sourcesSchema } from '../sources/schema.gql';
import {
  Direction,
  FlowDirection,
  FlowTarget,
  NetworkDnsFields,
  NetworkTopNFlowFields,
} from '../types';

import { getNetworkQueryMock, mockNetworkDnsData, mockNetworkTopNFlowData } from './network.mock';
import { networkSchema } from './schema.gql';

const testNetworkTopNFlowSource = {
  id: 'Test case to query Network Top N Flow',
  query: `
    query GetNetworkTopNFlowQuery(
      $filterQuery: String
      $flowDirection: FlowDirection!
      $flowTarget: FlowTarget!
      $pagination: PaginationInput!
      $sort: NetworkTopNFlowSortField!
      $timerange: TimerangeInput!
    ) {
      source(id: "default") {
        NetworkTopNFlow(
          filterQuery: $filterQuery
          flowDirection: $flowDirection
          flowTarget: $flowTarget
          pagination: $pagination
          sort: $sort
          timerange: $timerange
        ) {
          totalCount
          edges {
            node {
              _id
              source {
                ip
                domain
                count
              }
              destination {
                ip
                domain
              }
              network {
                bytes
                packets
                direction
              }
            }
            cursor {
              value
            }
          }
          pageInfo {
            endCursor {
              value
            }
            hasNextPage
          }
        }
      }
    }
	`,
  variables: {
    timerange: {
      interval: '12h',
      to: new Date('2018-01-01T05:00:00.000Z').valueOf(),
      from: new Date('2019-01-01T04:59:59.999Z').valueOf(),
    },
    sort: { field: NetworkTopNFlowFields.bytes, direction: Direction.desc },
    flowTarget: FlowTarget.source,
    flowDirection: FlowDirection.uniDirectional,
    pagination: {
      limit: 2,
      cursor: null,
    },
  },
  context: {
    req: {
      payload: {
        operationName: 'top-n-flow',
      },
    },
  },
  expected: {
    data: {
      source: {
        ...mockNetworkTopNFlowData,
      },
    },
  },
};

const testNetworkDnsSource = {
  id: 'Test case to query Network DNS Domains',
  query: `
    query GetNetworkDnsQuery(
      $sort: NetworkDnsSortField!
      $isPtrIncluded: Boolean!
      $timerange: TimerangeInput!
      $pagination: PaginationInput!
      $filterQuery: String
    ) {
      source(id: "default") {
        NetworkDns(
          isPtrIncluded: $isPtrIncluded
          sort: $sort
          timerange: $timerange
          pagination: $pagination
          filterQuery: $filterQuery
        ) {
          totalCount
          edges {
            node {
              _id
              dnsBytesIn
              dnsBytesOut
              dnsName
              queryCount
              uniqueDomains
            }
            cursor {
              value
            }
          }
          pageInfo {
            endCursor {
              value
            }
            hasNextPage
          }
        }
      }
    }
	`,
  variables: {
    timerange: {
      interval: '12h',
      to: 1514782800000,
      from: 1546318799999,
    },
    isPtrIncluded: false,
    sort: { field: NetworkDnsFields.uniqueDomains, direction: Direction.asc },
    pagination: {
      limit: 2,
      cursor: null,
    },
  },
  context: {
    req: {
      payload: {
        operationName: 'dns',
      },
    },
  },
  expected: {
    data: {
      source: {
        ...mockNetworkDnsData,
      },
    },
  },
};

describe('Test Network Schema', () => {
  // Array of case types
  const cases = [testNetworkTopNFlowSource, testNetworkDnsSource];
  const typeDefs = [
    rootSchema,
    sharedSchema,
    sourcesSchema,
    sourceStatusSchema,
    ecsSchema,
    networkSchema,
    dateSchema,
    toNumberSchema,
    toDateSchema,
    toBooleanSchema,
  ];
  const mockSchema = makeExecutableSchema({ typeDefs });

  // Here we specify the return payloads of mocked types
  const logger: Logger = {
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  };
  const mocks = {
    Query: () => ({
      ...getNetworkQueryMock(logger),
    }),
  };

  addMockFunctionsToSchema({
    schema: mockSchema,
    mocks,
  });

  cases.forEach(obj => {
    const { id, query, variables, context, expected } = obj;

    test(`${id}`, async () => {
      const result = await graphql(mockSchema, query, null, context, variables);
      return await expect(result).toEqual(expected);
    });
  });
});
