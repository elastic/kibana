/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { graphql } from 'graphql';
import { addMockFunctionsToSchema, makeExecutableSchema, mockServer } from 'graphql-tools';

import { rootSchema } from '../../../common/graphql/root/schema.gql';
import { sourcesSchema } from './schema.gql';
import { getSourceQueryMock, mockSourceData } from './source.mock';

const testCaseSource = {
  id: 'Test case Source',
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

describe('Schema', () => {
  // Array of case types
  const cases = [testCaseSource];
  const typeDefs = [rootSchema, sourcesSchema];
  const mockSchema = makeExecutableSchema({ typeDefs });

  // Here we specify the return payloads of mocked types
  const mocks = {
    Query: () => ({
      ...getSourceQueryMock(null),
    }),
  };

  addMockFunctionsToSchema({
    schema: mockSchema,
    mocks,
  });

  cases.forEach(obj => {
    const { id, query, variables, context, expected } = obj;

    test(`query: ${id}`, async () => {
      const result = await graphql(mockSchema, query, null, context, variables);
      return await expect(result).toEqual(expected);
    });
  });
});
