/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import sinon from 'sinon';

import { AnyObject, EsClient } from '../lib/esqueue';
import { Logger } from '../log';
import { SymbolSearchClient } from './symbol_search_client';

let symbolSearchClient: SymbolSearchClient;
let esClient;

// Setup the entire SymbolSearchClient.
function initSearchClient() {
  const log: Logger = (sinon.stub() as any) as Logger;
  esClient = initEsClient();

  symbolSearchClient = new SymbolSearchClient(esClient, log);
}

const mockSearchResults = [
  // 1. The first response is a valid SymbolSearchResult with 2 symbols
  {
    took: 1,
    hits: {
      total: {
        value: 2,
      },
      hits: [
        {
          _source: {
            qname: 'copyStaticAssets.shell',
            symbolInformation: {
              name: 'shell',
              kind: 13,
              location: {
                uri:
                  'git://github.com/Microsoft/TypeScript-Node-Starter/blob/4779cb7/copyStaticAssets.ts',
                range: {
                  start: {
                    line: 0,
                    character: 7,
                  },
                  end: {
                    line: 0,
                    character: 17,
                  },
                },
              },
              containerName: 'copyStaticAssets',
            },
          },
        },
        {
          _source: {
            qname: 'app.apiController',
            symbolInformation: {
              name: 'apiController',
              kind: 13,
              location: {
                uri: 'git://github.com/Microsoft/TypeScript-Node-Starter/blob/4779cb7/src/app.ts',
                range: {
                  start: {
                    line: 24,
                    character: 7,
                  },
                  end: {
                    line: 24,
                    character: 25,
                  },
                },
              },
              containerName: 'app',
            },
          },
        },
      ],
    },
  },
  // 2. The second response is a valid SymbolSearchResult with 0 symbol.
  {
    took: 1,
    hits: {
      total: {
        value: 0,
      },
      hits: [],
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

test('Symbol suggest/typeahead', async () => {
  // 1. The first response should have 2 results.
  const responseWithResult = await symbolSearchClient.suggest({ query: 'mockQuery', page: 1 });
  expect(responseWithResult.symbols.length).toEqual(2);
  expect(responseWithResult.total).toEqual(2);
  expect(responseWithResult.symbols[0]).toEqual({
    qname: 'copyStaticAssets.shell',
    symbolInformation: {
      name: 'shell',
      kind: 13,
      location: {
        uri: 'git://github.com/Microsoft/TypeScript-Node-Starter/blob/4779cb7/copyStaticAssets.ts',
        range: {
          start: {
            line: 0,
            character: 7,
          },
          end: {
            line: 0,
            character: 17,
          },
        },
      },
      containerName: 'copyStaticAssets',
    },
  });
  expect(responseWithResult.symbols[1]).toEqual({
    qname: 'app.apiController',
    symbolInformation: {
      name: 'apiController',
      kind: 13,
      location: {
        uri: 'git://github.com/Microsoft/TypeScript-Node-Starter/blob/4779cb7/src/app.ts',
        range: {
          start: {
            line: 24,
            character: 7,
          },
          end: {
            line: 24,
            character: 25,
          },
        },
      },
      containerName: 'app',
    },
  });

  // 2. The second response should have 0 results.
  const responseWithEmptyResult = await symbolSearchClient.suggest({ query: 'mockQuery', page: 1 });
  expect(responseWithEmptyResult.symbols.length).toEqual(0);
  expect(responseWithEmptyResult.total).toEqual(0);
});
