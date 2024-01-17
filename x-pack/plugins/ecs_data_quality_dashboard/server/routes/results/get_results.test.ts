/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { RESULTS_ROUTE_PATH } from '../../../common/constants';

import { serverMock } from '../../__mocks__/server';
import { requestMock } from '../../__mocks__/request';
import { requestContextMock } from '../../__mocks__/request_context';
import type { LatestAggResponseBucket } from './get_results';
import { getResultsRoute } from './get_results';
import { loggerMock, type MockedLogger } from '@kbn/logging-mocks';
import { resultBody, resultDocument } from './results.mock';
import type { SearchResponse } from '@elastic/elasticsearch/lib/api/types';
import type { ResultDocument } from '../../schemas/result';

const searchResponse = {
  aggregations: {
    latest: {
      buckets: [
        {
          key: 'logs-*',
          latest_doc: { hits: { hits: [{ _source: resultDocument }] } },
        },
      ],
    },
  },
} as unknown as SearchResponse<
  ResultDocument,
  Record<string, { buckets: LatestAggResponseBucket[] }>
>;

describe('getResultsRoute route', () => {
  let server: ReturnType<typeof serverMock.create>;
  let { context } = requestContextMock.createTools();
  let logger: MockedLogger;

  const req = requestMock.create({
    method: 'get',
    path: RESULTS_ROUTE_PATH,
    query: { patterns: 'logs-*,alerts-*' },
  });

  beforeEach(() => {
    jest.clearAllMocks();

    server = serverMock.create();
    logger = loggerMock.create();

    ({ context } = requestContextMock.createTools());

    getResultsRoute(server.router, logger);
  });

  it('gets result', async () => {
    const mockSearch = context.core.elasticsearch.client.asInternalUser.search;
    mockSearch.mockResolvedValueOnce(searchResponse);

    const response = await server.inject(req, requestContextMock.convertContext(context));
    expect(mockSearch).toHaveBeenCalled();

    expect(response.status).toEqual(200);
    expect(response.body).toEqual([{ '@timestamp': expect.any(Number), ...resultBody }]);
  });

  it('handles results data stream error', async () => {
    const errorMessage = 'Installation Error!';
    context.dataQualityDashboard.getResultsIndexName.mockRejectedValueOnce(new Error(errorMessage));
    const response = await server.inject(req, requestContextMock.convertContext(context));
    expect(response.status).toEqual(503);
    expect(response.body).toEqual({
      message: expect.stringContaining(errorMessage),
      status_code: 503,
    });
    expect(logger.error).toHaveBeenCalledWith(expect.stringContaining(errorMessage));
  });

  it('handles error', async () => {
    const errorMessage = 'Error!';
    const mockSearch = context.core.elasticsearch.client.asInternalUser.search;
    mockSearch.mockRejectedValueOnce({ message: errorMessage });

    const response = await server.inject(req, requestContextMock.convertContext(context));
    expect(response.status).toEqual(500);
    expect(response.body).toEqual({ message: errorMessage, status_code: 500 });
  });
});

describe('request validation', () => {
  let server: ReturnType<typeof serverMock.create>;
  let logger: MockedLogger;
  beforeEach(() => {
    server = serverMock.create();
    logger = loggerMock.create();
    getResultsRoute(server.router, logger);
  });

  test('disallows invalid query param', () => {
    const req = requestMock.create({
      method: 'get',
      path: RESULTS_ROUTE_PATH,
      query: {},
    });
    const result = server.validate(req);

    expect(result.badRequest).toHaveBeenCalled();
  });
});
