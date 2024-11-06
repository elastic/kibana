/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { GET_INDEX_STATS } from '../../common/constants';

import { fetchAvailableIndices, fetchMeteringStats, fetchStats } from '../lib';

import { serverMock } from '../__mocks__/server';
import { requestMock } from '../__mocks__/request';
import { requestContextMock } from '../__mocks__/request_context';
import { getIndexStatsRoute } from './get_index_stats';
import type { MockedLogger } from '@kbn/logging-mocks';
import { loggerMock } from '@kbn/logging-mocks';
import { mockStatsGreenIndex } from '../__mocks__/mock_stats_green_index';
import { mockStatsYellowIndex } from '../__mocks__/mock_stats_yellow_index';
import { mockMeteringStatsIndex } from '../__mocks__/mock_metering_stats_index';

jest.mock('../lib', () => {
  const originalModule = jest.requireActual('../lib');
  return {
    ...originalModule,
    fetchStats: jest.fn(),
    fetchMeteringStats: jest.fn(),
    fetchAvailableIndices: jest.fn(),
  };
});

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

  test('Returns index stats when index health is green', async () => {
    const mockIndices = {
      'auditbeat-custom-index-1': {
        name: 'auditbeat-custom-index-1',
        num_docs: 4,
        size_in_bytes: 28425,
        uuid: 'jRlr6H_jSAysOLZ6KynoCQ',
      },
    };
    (fetchStats as jest.Mock).mockResolvedValue({
      indices: mockStatsGreenIndex,
    });

    const response = await server.inject(req, requestContextMock.convertContext(context));
    expect(response.status).toEqual(200);
    expect(response.body).toEqual(mockIndices);
  });

  test('Returns index stats when index health is yellow', async () => {
    const mockIndices = {
      '.ds-packetbeat-8.6.1-2023.02.04-000001': {
        name: '.ds-packetbeat-8.6.1-2023.02.04-000001',
        num_docs: 1628343,
        size_in_bytes: 731583142,
        uuid: 'x5Uuw4j4QM2YidHLNixCwg',
      },
      '.ds-packetbeat-8.5.3-2023.02.04-000001': {
        name: '.ds-packetbeat-8.5.3-2023.02.04-000001',
        num_docs: 1630289,
        size_in_bytes: 733175040,
        uuid: 'we0vNWm2Q6iz6uHubyHS6Q',
      },
    };
    (fetchStats as jest.Mock).mockResolvedValue({
      indices: mockStatsYellowIndex,
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

    (fetchStats as jest.Mock).mockResolvedValue({
      indices: mockMeteringStatsIndex,
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
      'my-index-000001': {
        name: 'my-index-000001',
        num_docs: 2,
        size_in_bytes: null,
      },
    };
    (fetchMeteringStats as jest.Mock).mockResolvedValue(mockMeteringStatsIndex);
    (fetchAvailableIndices as jest.Mock).mockResolvedValue({
      aggregations: {
        index: {
          buckets: [
            {
              key: 'my-index-000001',
            },
          ],
        },
      },
    });

    const response = await server.inject(request, requestContextMock.convertContext(context));
    expect(response.status).toEqual(200);
    expect(response.body).toEqual(mockIndices);
  });

  test('returns an empty object when "meteringStats indices" are not available', async () => {
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

    const mockIndices = {};
    (fetchMeteringStats as jest.Mock).mockResolvedValue({ indices: undefined });
    (fetchAvailableIndices as jest.Mock).mockResolvedValue({
      aggregations: undefined,
    });

    const response = await server.inject(request, requestContextMock.convertContext(context));
    expect(response.status).toEqual(200);
    expect(response.body).toEqual(mockIndices);
    expect(fetchAvailableIndices).not.toHaveBeenCalled();
    expect(logger.warn).toHaveBeenCalledWith(
      `No metering stats indices found under pattern: auditbeat-*`
    );
  });

  test('returns an empty object when "availableIndices" indices are not available', async () => {
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

    const mockIndices = {};
    (fetchMeteringStats as jest.Mock).mockResolvedValue(mockMeteringStatsIndex);
    (fetchAvailableIndices as jest.Mock).mockResolvedValue({
      aggregations: undefined,
    });

    const response = await server.inject(request, requestContextMock.convertContext(context));
    expect(response.status).toEqual(200);
    expect(response.body).toEqual(mockIndices);
    expect(logger.warn).toHaveBeenCalledWith(
      `No available indices found under pattern: auditbeat-*, in the given date range: now-7d - now`
    );
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
