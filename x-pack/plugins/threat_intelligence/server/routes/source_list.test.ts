/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaResponseFactory } from '@kbn/core/server';
import { httpServerMock } from '@kbn/core/server/mocks';
import { DataRequestHandlerContext } from '@kbn/data-plugin/server';
import { Observable } from 'rxjs';
import { sourceListRequestHandlerFactory } from './source_list';

const $mockSearchResult = new Observable((subscribe) => {
  const rawResponseFixture = {
    rawResponse: {
      aggregations: {
        feeds: { buckets: [] },
      },
    },
  };

  subscribe.next(rawResponseFixture);
  subscribe.complete();
});

const mockSearchClient = {
  mockSearch: jest.fn().mockReturnValue($mockSearchResult),

  get search() {
    return this.mockSearch;
  },
};

describe('source list route', () => {
  let mockResponse: jest.Mocked<KibanaResponseFactory>;

  beforeEach(() => {
    mockResponse = httpServerMock.createResponseFactory();

    mockSearchClient.mockSearch.mockClear();
  });

  it('should execute sources search', async () => {
    const mockRequest = httpServerMock.createKibanaRequest();
    const listSourcesRequestHandler = sourceListRequestHandlerFactory();

    await listSourcesRequestHandler(
      {
        search: mockSearchClient,
      } as any as DataRequestHandlerContext,
      mockRequest,
      mockResponse
    );

    expect(mockSearchClient.mockSearch).toHaveBeenCalled();
    expect(mockSearchClient.mockSearch).toHaveBeenCalledWith(
      expect.objectContaining({
        params: {
          body: {
            aggs: {
              feeds: {
                aggs: { last_seen: { max: { field: 'event.created' } } },
                terms: { field: 'threat.feed.name' },
              },
            },
            query: { exists: { field: 'threat' } },
          },
        },
      }),
      expect.anything()
    );
  });
});
