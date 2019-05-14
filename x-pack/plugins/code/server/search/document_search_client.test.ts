/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import sinon from 'sinon';

import { AnyObject, EsClient } from '../lib/esqueue';
import { Logger } from '../log';
import { DocumentSearchClient } from './document_search_client';

let docSearchClient: DocumentSearchClient;
let esClient;

// Setup the entire RepositorySearchClient.
function initSearchClient() {
  const log: Logger = (sinon.stub() as any) as Logger;
  esClient = initEsClient();

  docSearchClient = new DocumentSearchClient(esClient, log);
}

const mockSearchResults = [
  // 1. The first response is a valid DocumentSearchResult with 2 docs
  {
    took: 1,
    hits: {
      total: {
        value: 2,
      },
      hits: [
        // File content matching
        {
          _source: {
            repoUri: 'github.com/Microsoft/TypeScript-Node-Starter',
            path: 'src/types/express-flash.d.ts',
            content:
              "\n/// <reference types='express' />\n\n// Add RequestValidation Interface on to Express's Request Interface.\ndeclare namespace Express {\n    interface Request extends Flash {}\n}\n\ninterface Flash {\n    flash(type: string, message: any): void;\n}\n\ndeclare module 'express-flash';\n\n",
            language: 'typescript',
            qnames: ['express-flash', 'Express', 'Request', 'Flash', 'flash'],
          },
          highlight: {
            content: [
              'declare namespace Express {\n    interface Request extends Flash {}\n}\n\ninterface Flash {\n    flash(type: _@_string_@_',
            ],
          },
        },
        // File path matching
        {
          _source: {
            repoUri: 'github.com/Microsoft/TypeScript-Node-Starter',
            path: 'src/types/string.d.ts',
            content:
              'no query in content;\nno query in content;\nno query in content;\nno query in content;\nno query in content;\n',
            language: 'typescript',
            qnames: ['express-flash'],
          },
          highlight: {
            content: [],
          },
        },
      ],
    },
    aggregations: {
      repoUri: {
        buckets: [
          {
            'github.com/Microsoft/TypeScript-Node-Starter': 2,
          },
        ],
      },
      language: {
        buckets: [
          {
            typescript: 2,
          },
        ],
      },
    },
  },
  // 2. The second response is a valid DocumentSearchResult with 0 doc
  {
    took: 1,
    hits: {
      total: {
        value: 0,
      },
      hits: [],
    },
    aggregations: {
      repoUri: {
        buckets: [],
      },
      language: {
        buckets: [],
      },
    },
  },
];

// Setup the mock EsClient.
function initEsClient(): EsClient {
  esClient = {
    search: async (_: AnyObject): Promise<any> => {
      Promise.resolve({});
    },
  };
  const searchStub = sinon.stub(esClient, 'search');

  // Binding the mock search results to the stub.
  mockSearchResults.forEach((result, index) => {
    searchStub.onCall(index).returns(Promise.resolve(result));
  });

  return (esClient as any) as EsClient;
}

beforeEach(() => {
  initSearchClient();
});

test('Document search', async () => {
  // 1. The first response should have 1 result.
  const responseWithResult = await docSearchClient.search({ query: 'string', page: 1 });
  expect(responseWithResult).toEqual(
    expect.objectContaining({
      total: 2,
      totalPage: 1,
      page: 1,
      query: 'string',
      results: [
        {
          uri: 'github.com/Microsoft/TypeScript-Node-Starter',
          filePath: 'src/types/express-flash.d.ts',
          compositeContent: {
            // Content is shorted
            content: '\n\ninterface Flash {\n    flash(type: string, message: any): void;\n}\n\n',
            // Line mapping data is populated
            lineMapping: ['..', '8', '9', '10', '11', '12', '..'],
            // Highlight ranges are calculated
            ranges: [
              {
                endColumn: 23,
                endLineNumber: 4,
                startColumn: 17,
                startLineNumber: 4,
              },
            ],
          },
          language: 'typescript',
          hits: 1,
        },
        {
          uri: 'github.com/Microsoft/TypeScript-Node-Starter',
          filePath: 'src/types/string.d.ts',
          compositeContent: {
            // Content is shorted
            content: 'no query in content;\nno query in content;\nno query in content;\n',
            // Line mapping data is populated
            lineMapping: ['1', '2', '3', '..'],
            // Highlight ranges are calculated
            ranges: [],
          },
          language: 'typescript',
          hits: 0,
        },
      ],
      repoAggregations: [
        {
          'github.com/Microsoft/TypeScript-Node-Starter': 2,
        },
      ],
      langAggregations: [
        {
          typescript: 2,
        },
      ],
    })
  );

  // 2. The first response should have 0 results.
  const responseWithEmptyResult = await docSearchClient.search({ query: 'string', page: 1 });
  expect(responseWithEmptyResult.results!.length).toEqual(0);
  expect(responseWithEmptyResult.total).toEqual(0);
});

test('Document suggest', async () => {
  // 1. The first response should have 1 result.
  const responseWithResult = await docSearchClient.suggest({ query: 'string', page: 1 });
  expect(responseWithResult).toEqual(
    expect.objectContaining({
      total: 2,
      totalPage: 1,
      page: 1,
      query: 'string',
      results: [
        {
          uri: 'github.com/Microsoft/TypeScript-Node-Starter',
          filePath: 'src/types/express-flash.d.ts',
          // compositeContent field is intended to leave empty.
          compositeContent: {
            content: '',
            lineMapping: [],
            ranges: [],
          },
          language: 'typescript',
          hits: 0,
        },
        {
          uri: 'github.com/Microsoft/TypeScript-Node-Starter',
          filePath: 'src/types/string.d.ts',
          // compositeContent field is intended to leave empty.
          compositeContent: {
            content: '',
            lineMapping: [],
            ranges: [],
          },
          language: 'typescript',
          hits: 0,
        },
      ],
    })
  );

  // 2. The second response should have 0 result.
  const responseWithEmptyResult = await docSearchClient.suggest({ query: 'string', page: 1 });
  expect(responseWithEmptyResult.results!.length).toEqual(0);
  expect(responseWithEmptyResult.total).toEqual(0);
});
