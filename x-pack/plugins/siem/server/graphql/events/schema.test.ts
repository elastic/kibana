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
  getEventsQueryMock,
  mockEventsData,
  mockTimelineData,
  mockTimelineDetailsData,
} from './events.mock';
import { eventsSchema } from './schema.gql';

const cases = [
  {
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
        sortFieldId: '@timestamp',
        direction: 'desc',
      },
    },
    context: {
      req: {
        payload: {
          operationName: 'events',
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
  },
  {
    id: 'Test case to query Timeline',
    query: `
    query GetTimelineQuery(
      $timerange: TimerangeInput!
      $pagination: PaginationInput!
      $sortField: SortField!
      $filterQuery: String
      $fieldRequested: [String!]!
    ) {
      source(id: "default") {
        Timeline(
          timerange: $timerange
          pagination: $pagination
          sortField: $sortField
          filterQuery: $filterQuery
          fieldRequested: $fieldRequested
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
              data {
                field
                value
              }
              ecs {
                timestamp
                _id
                _index
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
        sortFieldId: '@timestamp',
        direction: 'desc',
      },
      fieldRequested: ['@timestamp', 'host.name'],
    },
    context: {
      req: {
        payload: {
          operationName: 'timeline',
        },
      },
    },
    expected: {
      data: {
        source: {
          ...mockTimelineData,
        },
      },
    },
  },
  {
    id: 'Test case to query Timeline Details',
    query: `
      query GetTimelineDetailsQuery($eventId: String!, $indexName: String!) {
        source(id: "default") {
          TimelineDetails(eventId: $eventId, indexName: $indexName) {
            data {
              category
              description
              example
              field
              type
              values
              originalValue
            }
          }
        }
      }
    `,
    variables: {
      eventId: 'QRhG1WgBqd-n62SwZYDT',
      indexName: 'filebeat-7.0.0-iot-2019.06',
    },
    context: {
      req: {
        payload: {
          operationName: 'details',
        },
      },
    },
    expected: {
      data: {
        source: {
          ...mockTimelineDetailsData,
        },
      },
    },
  },
];

describe('Test Source Schema', () => {
  const typeDefs = [
    rootSchema,
    sharedSchema,
    sourcesSchema,
    sourceStatusSchema,
    ecsSchema,
    eventsSchema,
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
