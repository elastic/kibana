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
  getOverviewHostQueryMock,
  getOverviewNetworkQueryMock,
  mockOverviewHostData,
  mockOverviewNetworkData,
} from './overview.mock';
import { overviewSchema } from './schema.gql';

const testOverviewNetworkSource = {
  id: 'Test case to query Siem Overview Network data',
  query: `
    query GetOverviewNetworkQuery(
      $timerange: TimerangeInput!
      $filterQuery: String
    ) {
      source(id: "default") {
        OverviewNetwork(timerange: $timerange, filterQuery: $filterQuery) {
          packetbeatFlow
          packetbeatDNS
          filebeatSuricata
          filebeatZeek
          auditbeatSocket
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
        ...mockOverviewNetworkData,
      },
    },
  },
};

const testOverviewHostSource = {
  id: 'Test case to query Siem Overview Host data',
  query: `
    query GetOverviewHostQuery(
      $timerange: TimerangeInput!
      $filterQuery: String
    ) {
      source(id: "default") {
        OverviewHost(timerange: $timerange, filterQuery: $filterQuery) {
          auditbeatAuditd
          auditbeatFIM
          auditbeatLogin
          auditbeatPackage
          auditbeatProcess
          auditbeatUser
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
        ...mockOverviewHostData,
      },
    },
  },
};
describe('SIEM Overview GQL Schema', () => {
  describe('Test Host Schema', () => {
    // Array of case types
    const cases = [testOverviewHostSource];
    const typeDefs = [
      rootSchema,
      sharedSchema,
      sourcesSchema,
      sourceStatusSchema,
      ecsSchema,
      overviewSchema,
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
        ...getOverviewHostQueryMock(logger),
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
  describe('Test Network Schema', () => {
    // Array of case types
    const cases = [testOverviewNetworkSource];
    const typeDefs = [
      rootSchema,
      sharedSchema,
      sourcesSchema,
      sourceStatusSchema,
      ecsSchema,
      overviewSchema,
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
        ...getOverviewNetworkQueryMock(logger),
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
});
