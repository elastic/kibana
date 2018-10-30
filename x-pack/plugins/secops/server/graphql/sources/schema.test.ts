/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { graphql } from 'graphql';
import { addMockFunctionsToSchema, makeExecutableSchema } from 'graphql-tools';

import { rootSchema } from '../../../common/graphql/root/schema.gql';
import { Logger } from '../../utils/logger';
import { sourcesSchema } from './schema.gql';
import { getSourceQueryMock, mockSourceData } from './source.mock';

const testCaseSource = {
  id: 'Test case to query basic information from source',
  query: `
		query SourceQuery($sourceId: ID!) {
			source(id: $sourceId) {
				id
				configuration {
					fields {
						host
					}
				}
			}
		}
	`,
  variables: { sourceId: 'default' },
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
        ...mockSourceData,
      },
    },
  },
};

describe('Test Source Schema', () => {
  // Array of case types
  const cases = [testCaseSource];
  const typeDefs = [rootSchema, sourcesSchema];
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
      ...getSourceQueryMock(logger),
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
