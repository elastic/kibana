/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { getSearchListItemMock } from '../../../common/schemas/elastic_response/search_es_list_item_schema.mock';
import { getCallClusterMock } from '../../../common/get_call_cluster.mock';
import { LIST_ID, LIST_ITEM_INDEX } from '../../../common/constants.mock';

import {
  getExportListItemsToStreamOptionsMock,
  getResponseOptionsMock,
  getWriteNextResponseOptions,
  getWriteResponseHitsToStreamOptionsMock,
} from './write_list_items_to_streams.mock';

import {
  exportListItemsToStream,
  getResponse,
  getSearchAfterFromResponse,
  writeNextResponse,
  writeResponseHitsToStream,
} from '.';

describe('write_list_items_to_stream', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('exportListItemsToStream', () => {
    test('It exports empty list items to the stream as an empty array', (done) => {
      const options = getExportListItemsToStreamOptionsMock();
      const firstResponse = getSearchListItemMock();
      firstResponse.hits.hits = [];
      options.callCluster = getCallClusterMock(firstResponse);
      exportListItemsToStream(options);

      let chunks: string[] = [];
      options.stream.on('data', (chunk: Buffer) => {
        chunks = [...chunks, chunk.toString()];
      });

      options.stream.on('finish', () => {
        expect(chunks).toEqual([]);
        done();
      });
    });

    test('It exports single list item to the stream', (done) => {
      const options = getExportListItemsToStreamOptionsMock();
      exportListItemsToStream(options);

      let chunks: string[] = [];
      options.stream.on('data', (chunk: Buffer) => {
        chunks = [...chunks, chunk.toString()];
      });

      options.stream.on('finish', () => {
        expect(chunks).toEqual(['127.0.0.1']);
        done();
      });
    });

    test('It exports two list items to the stream', (done) => {
      const options = getExportListItemsToStreamOptionsMock();
      const firstResponse = getSearchListItemMock();
      const secondResponse = getSearchListItemMock();
      firstResponse.hits.hits = [...firstResponse.hits.hits, ...secondResponse.hits.hits];
      options.callCluster = getCallClusterMock(firstResponse);
      exportListItemsToStream(options);

      let chunks: string[] = [];
      options.stream.on('data', (chunk: Buffer) => {
        chunks = [...chunks, chunk.toString()];
      });

      options.stream.on('finish', () => {
        expect(chunks).toEqual(['127.0.0.1', '127.0.0.1']);
        done();
      });
    });

    test('It exports two list items to the stream with two separate calls', (done) => {
      const options = getExportListItemsToStreamOptionsMock();

      const firstResponse = getSearchListItemMock();
      firstResponse.hits.hits[0].sort = ['some-sort-value'];

      const secondResponse = getSearchListItemMock();
      secondResponse.hits.hits[0]._source.ip = '255.255.255.255';

      options.callCluster = jest
        .fn()
        .mockResolvedValueOnce(firstResponse)
        .mockResolvedValueOnce(secondResponse);

      exportListItemsToStream(options);

      let chunks: string[] = [];
      options.stream.on('data', (chunk: Buffer) => {
        chunks = [...chunks, chunk.toString()];
      });

      options.stream.on('finish', () => {
        expect(chunks).toEqual(['127.0.0.1', '255.255.255.255']);
        done();
      });
    });
  });

  describe('writeNextResponse', () => {
    test('It returns an empty searchAfter response when there is no sort defined', async () => {
      const options = getWriteNextResponseOptions();
      const searchAfter = await writeNextResponse(options);
      expect(searchAfter).toEqual(undefined);
    });

    test('It returns a searchAfter response when there is a sort defined', async () => {
      const listItem = getSearchListItemMock();
      listItem.hits.hits[0].sort = ['sort-value-1'];
      const options = getWriteNextResponseOptions();
      options.callCluster = getCallClusterMock(listItem);
      const searchAfter = await writeNextResponse(options);
      expect(searchAfter).toEqual(['sort-value-1']);
    });

    test('It returns a searchAfter response of undefined when the response is empty', async () => {
      const listItem = getSearchListItemMock();
      listItem.hits.hits = [];
      const options = getWriteNextResponseOptions();
      options.callCluster = getCallClusterMock(listItem);
      const searchAfter = await writeNextResponse(options);
      expect(searchAfter).toEqual(undefined);
    });
  });

  describe('getSearchAfterFromResponse', () => {
    test('It returns undefined if the hits array is empty', () => {
      const response = getSearchListItemMock();
      response.hits.hits = [];
      const searchAfter = getSearchAfterFromResponse({ response });
      expect(searchAfter).toEqual(undefined);
    });

    test('It returns undefined if the hits array does not have a sort', () => {
      const response = getSearchListItemMock();
      response.hits.hits[0].sort = undefined;
      const searchAfter = getSearchAfterFromResponse({ response });
      expect(searchAfter).toEqual(undefined);
    });

    test('It returns a sort of a single array if that single item exists', () => {
      const response = getSearchListItemMock();
      response.hits.hits[0].sort = ['sort-value-1', 'sort-value-2'];
      const searchAfter = getSearchAfterFromResponse({ response });
      expect(searchAfter).toEqual(['sort-value-1', 'sort-value-2']);
    });

    test('It returns a sort of the last array element of size 2', () => {
      const response = getSearchListItemMock();
      const response2 = getSearchListItemMock();
      response2.hits.hits[0].sort = ['sort-value'];
      response.hits.hits = [...response.hits.hits, ...response2.hits.hits];
      const searchAfter = getSearchAfterFromResponse({ response });
      expect(searchAfter).toEqual(['sort-value']);
    });
  });

  describe('getResponse', () => {
    test('It returns a simple response with the default size of 100', async () => {
      const options = getResponseOptionsMock();
      options.searchAfter = ['string 1', 'string 2'];
      await getResponse(options);
      const expected = {
        body: {
          query: { term: { list_id: LIST_ID } },
          search_after: ['string 1', 'string 2'],
          sort: [{ tie_breaker_id: 'asc' }],
        },
        ignoreUnavailable: true,
        index: LIST_ITEM_INDEX,
        size: 100,
      };
      expect(options.callCluster).toBeCalledWith('search', expected);
    });

    test('It returns a simple response with expected values and size changed', async () => {
      const options = getResponseOptionsMock();
      options.searchAfter = ['string 1', 'string 2'];
      options.size = 33;
      await getResponse(options);
      const expected = {
        body: {
          query: { term: { list_id: LIST_ID } },
          search_after: ['string 1', 'string 2'],
          sort: [{ tie_breaker_id: 'asc' }],
        },
        ignoreUnavailable: true,
        index: LIST_ITEM_INDEX,
        size: 33,
      };
      expect(options.callCluster).toBeCalledWith('search', expected);
    });
  });

  describe('writeResponseHitsToStream', () => {
    test('it will push into the stream the mock response', (done) => {
      const options = getWriteResponseHitsToStreamOptionsMock();
      writeResponseHitsToStream(options);

      let chunks: string[] = [];
      options.stream.on('data', (chunk: Buffer) => {
        chunks = [...chunks, chunk.toString()];
      });

      options.stream.end(() => {
        expect(chunks).toEqual(['127.0.0.1']);
        done();
      });
    });

    test('it will push into the stream an empty mock response', (done) => {
      const options = getWriteResponseHitsToStreamOptionsMock();
      options.response.hits.hits = [];
      writeResponseHitsToStream(options);

      let chunks: string[] = [];
      options.stream.on('data', (chunk: Buffer) => {
        chunks = [...chunks, chunk.toString()];
      });

      options.stream.on('finish', () => {
        expect(chunks).toEqual([]);
        done();
      });
      options.stream.end();
    });

    test('it will push into the stream 2 mock responses', (done) => {
      const options = getWriteResponseHitsToStreamOptionsMock();
      const secondResponse = getSearchListItemMock();
      options.response.hits.hits = [...options.response.hits.hits, ...secondResponse.hits.hits];
      writeResponseHitsToStream(options);

      let chunks: string[] = [];
      options.stream.on('data', (chunk: Buffer) => {
        chunks = [...chunks, chunk.toString()];
      });

      options.stream.end(() => {
        expect(chunks).toEqual(['127.0.0.1', '127.0.0.1']);
        done();
      });
    });

    test('it will push an additional string given to it such as a new line character', (done) => {
      const options = getWriteResponseHitsToStreamOptionsMock();
      const secondResponse = getSearchListItemMock();
      options.response.hits.hits = [...options.response.hits.hits, ...secondResponse.hits.hits];
      options.stringToAppend = '\n';
      writeResponseHitsToStream(options);

      let chunks: string[] = [];
      options.stream.on('data', (chunk: Buffer) => {
        chunks = [...chunks, chunk.toString()];
      });

      options.stream.end(() => {
        expect(chunks).toEqual(['127.0.0.1\n', '127.0.0.1\n']);
        done();
      });
    });

    test('it will throw an exception with a status code if the hit_source is not a data type we expect', () => {
      const options = getWriteResponseHitsToStreamOptionsMock();
      options.response.hits.hits[0]._source.ip = undefined;
      options.response.hits.hits[0]._source.keyword = undefined;
      const expected = `Encountered an error where hit._source was an unexpected type: ${JSON.stringify(
        options.response.hits.hits[0]._source
      )}`;
      expect(() => writeResponseHitsToStream(options)).toThrow(expected);
    });
  });
});
