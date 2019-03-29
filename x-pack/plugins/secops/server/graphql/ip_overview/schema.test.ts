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

import { getIpOverviewQueryMock, mockIpOverviewData } from './ip_overview.mock';

import { ipOverviewSchema } from './schema.gql';

const testCaseSource = {
  id: 'Test case to query IpOverview',
  query: `
  query GetIpOverviewQuery(
    $timerange: TimerangeInput!
    $filterQuery: String
    $ip: String!
  ) {
    source(id: "default") {
      IpOverview(timerange: $timerange, filterQuery: $filterQuery, ip: $ip) {
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
    timerange: {
      interval: '12h',
      to: new Date('2018-01-01T05:00:00.000Z').valueOf(),
      from: new Date('2019-01-01T04:59:59.999Z').valueOf(),
    },
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
    ipOverviewSchema,
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
