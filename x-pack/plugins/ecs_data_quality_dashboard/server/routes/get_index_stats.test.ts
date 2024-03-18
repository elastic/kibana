/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { GET_INDEX_STATS } from '../../common/constants';

import { fetchAvailableIndices, fetchStats } from '../lib';

import { serverMock } from '../__mocks__/server';
import { requestMock } from '../__mocks__/request';
import { requestContextMock } from '../__mocks__/request_context';
import { getIndexStatsRoute } from './get_index_stats';
import type { MockedLogger } from '@kbn/logging-mocks';
import { loggerMock } from '@kbn/logging-mocks';

jest.mock('../lib', () => ({
  fetchStats: jest.fn(),
  fetchAvailableIndices: jest.fn(),
}));

describe('getIndexStatsRoute route', () => {
  let server: ReturnType<typeof serverMock.create>;
  let { context } = requestContextMock.createTools();
  let logger: MockedLogger;

  const req = requestMock.create({
    method: 'get',
    path: GET_INDEX_STATS,
    params: {
      pattern: 'auditbeat-*',
    },
    query: {
      isILMAvailable: true,
      startDate: `now-7d`,
      endDate: `now`,
    },
  });

  beforeEach(() => {
    jest.clearAllMocks();

    server = serverMock.create();
    logger = loggerMock.create();

    ({ context } = requestContextMock.createTools());

    getIndexStatsRoute(server.router, logger);
  });

  test('Returns index stats', async () => {
    const mockIndices = { 'auditbeat-7.15.1-2022.12.06-000001': {} };
    (fetchStats as jest.Mock).mockResolvedValue({
      indices: mockIndices,
    });

    const response = await server.inject(req, requestContextMock.convertContext(context));
    expect(response.status).toEqual(200);
    expect(response.body).toEqual(mockIndices);
  });

  test('Handles error', async () => {
    const errorMessage = 'Error!';
    (fetchStats as jest.Mock).mockRejectedValue({ message: errorMessage });

    const response = await server.inject(req, requestContextMock.convertContext(context));
    expect(response.status).toEqual(500);
    expect(response.body).toEqual({ message: errorMessage, status_code: 500 });
  });

  test('requires date range when isILMAvailable is false', async () => {
    const request = requestMock.create({
      method: 'get',
      path: GET_INDEX_STATS,
      params: {
        pattern: `auditbeat-*`,
      },
      query: {
        isILMAvailable: false,
      },
    });

    const mockIndices = { 'auditbeat-7.15.1-2022.12.06-000001': {} };
    (fetchStats as jest.Mock).mockResolvedValue({
      indices: mockIndices,
    });

    const response = await server.inject(request, requestContextMock.convertContext(context));
    expect(response.status).toEqual(400);
    expect(response.body.status_code).toEqual(400);
    expect(response.body.message).toEqual(`startDate and endDate are required`);
  });

  test('returns available indices within the given date range when isILMAvailable is false', async () => {
    const request = requestMock.create({
      method: 'get',
      path: GET_INDEX_STATS,
      params: {
        pattern: `auditbeat-*`,
      },
      query: {
        isILMAvailable: false,
        startDate: `now-7d`,
        endDate: `now`,
      },
    });

    const mockIndices = {
      'auditbeat-7.15.1-2022.12.06-000001': {},
      'auditbeat-7.15.1-2022.11.06-000001': {},
    };
    (fetchStats as jest.Mock).mockResolvedValue({
      indices: mockIndices,
    });
    (fetchAvailableIndices as jest.Mock).mockResolvedValue({
      aggregations: {
        index: {
          buckets: [
            {
              key: 'auditbeat-7.15.1-2022.12.06-000001',
            },
          ],
        },
      },
    });

    const response = await server.inject(request, requestContextMock.convertContext(context));
    expect(response.status).toEqual(200);
    expect(response.body).toEqual({ 'auditbeat-7.15.1-2022.12.06-000001': {} });
  });
});

describe('request validation', () => {
  let server: ReturnType<typeof serverMock.create>;
  let logger: MockedLogger;

  beforeEach(() => {
    server = serverMock.create();
    logger = loggerMock.create();

    getIndexStatsRoute(server.router, logger);
  });

  test('disallows invalid pattern', () => {
    const request = requestMock.create({
      method: 'get',
      path: GET_INDEX_STATS,
      params: {
        pattern: 123,
      },
    });
    const result = server.validate(request);

    expect(result.badRequest).toHaveBeenCalled();
  });
});
