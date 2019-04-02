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
import { sourceStatusSchema } from '../source_status/schema.gql';
import { sourcesSchema } from '../sources/schema.gql';

import { getHostsQueryMock, mockHostsData } from './hosts.mock';
import { hostsSchema } from './schema.gql';

const testCaseSource = {
  id: 'Test case to query Hosts',
  query: `
    query HostsQuery ($timerange: TimerangeInput!, $pagination: PaginationInput!) {
      source(id: "default") {
        Hosts(timerange: $timerange, pagination: $pagination) {
          totalCount
          edges {
            node {
              _id
              firstSeen
              lastBeat
              host {
                name
                os {
                  name
                  version
                }
              }
            }
            cursor{
              value
            }
          }
          pageInfo{
            endCursor{
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
    pagination: {
      limit: 2,
      cursor: null,
    },
  },
  context: {
    req: {
      payload: {
        operationName: 'test',
      },
    },
  },
  expected: {
    data: {
      source: {
        ...mockHostsData,
      },
    },
  },
};

describe('Test Source Schema', () => {
  // Array of case types
  const cases = [testCaseSource];
  const typeDefs = [
    rootSchema,
    sharedSchema,
    sourcesSchema,
    sourceStatusSchema,
    ecsSchema,
    hostsSchema,
    dateSchema,
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
      ...getHostsQueryMock(logger),
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
