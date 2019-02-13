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
import { sourceStatusSchema } from '../source_status/schema.gql';
import { sourcesSchema } from '../sources/schema.gql';
import { getEventsQueryMock, mockEventsData } from './events.mock';
import { eventsSchema } from './schema.gql';

const testCaseSource = {
  id: 'Test case to query Events',
  query: `
    query GetEventsQuery(
      $timerange: TimerangeInput!
      $pagination: PaginationInput!
      $sortField: SortField!
      $filterQuery: String
    ) {
      source(id: "default") {
        Events(
          timerange: $timerange
          pagination: $pagination
          sortField: $sortField
          filterQuery: $filterQuery
        ) {
          totalCount
          pageInfo {
            endCursor {
              value
              tiebreaker
            }
            hasNextPage
          }
          edges {
            cursor{
              value
              tiebreaker
            }
            node {
              _id
              _index
              timestamp
              event {
                type
                severity
                module
                category
                id
              }
              host {
                name
                ip
              }
              source {
                ip
                port
              }
              destination {
                ip
                port
              }
              geo {
                region_name
                country_iso_code
              }
              suricata {
                eve {
                  proto
                  flow_id
                  alert {
                    signature
                    signature_id
                  }
                }
              }
            }
          }
          kpiEventType {
            value
            count
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
    sortField: {
      sortFieldId: 'timestamp',
      direction: 'descending',
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
        ...mockEventsData,
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
    eventsSchema,
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
      ...getEventsQueryMock(logger),
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
