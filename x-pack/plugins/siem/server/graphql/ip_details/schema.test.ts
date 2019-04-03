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

import { getIpOverviewQueryMock, mockIpOverviewData } from './ip_details.mock';

import { ipDetailsSchemas } from './schema.gql';

const testCaseSource = {
  id: 'Test case to query IpDetails',
  query: `
  query GetIpOverviewQuery(
    $filterQuery: String
    $ip: String!
  ) {
    source(id: "default") {
      IpOverview(filterQuery: $filterQuery, ip: $ip) {
        source {
          firstSeen
          lastSeen
          autonomousSystem {
            as_org
            asn
            ip
          }
          geo {
            continent_name
            city_name
            country_iso_code
            country_name
            location {
              lat
              lon
            }
            region_iso_code
            region_name
          }
          host {
            architecture
            id
            ip
            mac
            name
            os {
              kernel
              family
              name
              platform
              version
            }
            type
          }
        }
        destination {
          firstSeen
          lastSeen
          autonomousSystem {
            as_org
            asn
            ip
          }
          geo {
            continent_name
            city_name
            country_iso_code
            country_name
            location {
              lat
              lon
            }
            region_iso_code
            region_name
          }
          host {
            architecture
            id
            ip
            mac
            name
            os {
              kernel
              family
              name
              platform
              version
            }
            type
          }
        }
      }
    }
  }
`,
  variables: {
    ip: '10.10.10.10',
  },
  context: {
    req: {
      payload: {
        operationName: 'ip-overview',
      },
    },
  },
  expected: {
    data: {
      source: {
        ...mockIpOverviewData,
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
    ...ipDetailsSchemas,
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
      ...getIpOverviewQueryMock(logger),
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
