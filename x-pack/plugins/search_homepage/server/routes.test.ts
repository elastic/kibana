/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

jest.mock('./lib/fetch_indices', () => ({ fetchIndices: jest.fn() }));

import { mockLogger, MockRouter } from './__mocks__';

import { RequestHandlerContext } from '@kbn/core/server';
import { defineRoutes } from './routes';
import { APIRoutes } from '../common/routes';
import { DEFAULT_JSON_HEADERS } from './constants';
import { fetchIndices } from './lib/fetch_indices';

describe('Search Homepage routes', () => {
  let mockRouter: MockRouter;
  const mockClient = {
    asCurrentUser: {},
  };

  const mockCore = {
    elasticsearch: { client: mockClient },
  };
  let context: jest.Mocked<RequestHandlerContext>;
  beforeEach(() => {
    jest.clearAllMocks();

    context = {
      core: Promise.resolve(mockCore),
    } as unknown as jest.Mocked<RequestHandlerContext>;
  });

  describe('GET - Indices', () => {
    beforeEach(() => {
      mockRouter = new MockRouter({
        context,
        method: 'get',
        path: APIRoutes.GET_INDICES,
      });

      defineRoutes({
        logger: mockLogger,
        router: mockRouter.router,
        options: {
          hasIndexStats: true,
          getStartServices: jest.fn().mockResolvedValue([{}, {}, {}]),
        },
      });
    });

    it('return indices result', async () => {
      (fetchIndices as jest.Mock).mockResolvedValue({
        indices: [{ name: 'test', count: 0, aliases: [] }],
      });

      await mockRouter.callRoute({});

      expect(mockRouter.response.ok).toHaveBeenCalledWith({
        body: {
          indices: [
            {
              aliases: [],
              count: 0,
              name: 'test',
            },
          ],
        },
        headers: DEFAULT_JSON_HEADERS,
      });

      expect(fetchIndices as jest.Mock).toHaveBeenCalledWith(undefined, 5, expect.anything());
    });

    it('uses search query', async () => {
      (fetchIndices as jest.Mock).mockResolvedValue({
        indices: [{ name: 'test', count: 0, aliases: [] }],
      });

      await mockRouter.callRoute({
        query: {
          search_query: 'testing',
        },
      });

      expect(mockRouter.response.ok).toHaveBeenCalledWith({
        body: {
          indices: [
            {
              aliases: [],
              count: 0,
              name: 'test',
            },
          ],
        },
        headers: DEFAULT_JSON_HEADERS,
      });

      expect(fetchIndices as jest.Mock).toHaveBeenCalledWith('testing', 5, expect.anything());
    });
  });
});
