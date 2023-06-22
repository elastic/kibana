/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { GET_INDEX_STATS } from '../../common/constants';

import { fetchStats } from '../lib';

import { serverMock } from '../__mocks__/server';
import { requestMock } from '../__mocks__/request';
import { requestContextMock } from '../__mocks__/request_context';
import { getIndexStatsRoute } from './get_index_stats';

jest.mock('../lib', () => ({
  fetchStats: jest.fn(),
}));

describe('getIndexStatsRoute route', () => {
  let server: ReturnType<typeof serverMock.create>;
  let { context } = requestContextMock.createTools();
  const req = requestMock.create({
    method: 'get',
    path: GET_INDEX_STATS,
    params: {
      pattern: 'auditbeat-*',
    },
  });

  beforeEach(() => {
    jest.clearAllMocks();

    server = serverMock.create();
    ({ context } = requestContextMock.createTools());

    getIndexStatsRoute(server.router);
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
});

describe('request validation', () => {
  let server: ReturnType<typeof serverMock.create>;

  beforeEach(() => {
    server = serverMock.create();

    getIndexStatsRoute(server.router);
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
