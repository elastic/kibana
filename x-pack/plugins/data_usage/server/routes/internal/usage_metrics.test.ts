/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { MockedKeys } from '@kbn/utility-types-jest';
import type { CoreSetup } from '@kbn/core/server';
import { registerUsageMetricsRoute } from './usage_metrics';
import { coreMock } from '@kbn/core/server/mocks';
import { httpServerMock } from '@kbn/core/server/mocks';
import { DataUsageService } from '../../services';
import type {
  DataUsageRequestHandlerContext,
  DataUsageRouter,
  DataUsageServerStart,
} from '../../types';
import { DATA_USAGE_METRICS_API_ROUTE } from '../../../common';
import { createMockedDataUsageContext } from '../../mocks';
import { CustomHttpRequestError } from '../../utils';
import { AutoOpsError } from '../../services/errors';
import { timeXMinutesAgo } from '../../../common/test_utils';

describe('registerUsageMetricsRoute', () => {
  let mockCore: MockedKeys<CoreSetup<{}, DataUsageServerStart>>;
  let router: DataUsageRouter;
  let dataUsageService: DataUsageService;
  let context: DataUsageRequestHandlerContext;
  let mockedDataUsageContext: ReturnType<typeof createMockedDataUsageContext>;

  beforeEach(() => {
    mockCore = coreMock.createSetup();
    router = mockCore.http.createRouter();
    context = coreMock.createCustomRequestHandlerContext(
      coreMock.createRequestHandlerContext()
    ) as unknown as DataUsageRequestHandlerContext;

    mockedDataUsageContext = createMockedDataUsageContext(
      coreMock.createPluginInitializerContext()
    );
    dataUsageService = new DataUsageService(mockedDataUsageContext.logFactory.get());
  });

  it('should request correct API', () => {
    registerUsageMetricsRoute(router, mockedDataUsageContext);

    expect(router.versioned.post).toHaveBeenCalledTimes(1);
    expect(router.versioned.post).toHaveBeenCalledWith({
      access: 'internal',
      path: DATA_USAGE_METRICS_API_ROUTE,
    });
  });

  it('should throw error if no data streams in the request', async () => {
    registerUsageMetricsRoute(router, mockedDataUsageContext);

    const mockRequest = httpServerMock.createKibanaRequest({
      body: {
        from: timeXMinutesAgo(15),
        to: timeXMinutesAgo(0),
        metricTypes: ['ingest_rate'],
        dataStreams: [],
      },
    });
    const mockResponse = httpServerMock.createResponseFactory();
    const mockRouter = mockCore.http.createRouter.mock.results[0].value;
    const [[, handler]] = mockRouter.versioned.post.mock.results[0].value.addVersion.mock.calls;
    await handler(context, mockRequest, mockResponse);

    expect(mockResponse.customError).toHaveBeenCalledTimes(1);
    expect(mockResponse.customError).toHaveBeenCalledWith({
      body: new CustomHttpRequestError('[request body.dataStreams]: no data streams selected'),
      statusCode: 400,
    });
  });

  // TODO: fix this test
  it.skip('should correctly transform response', async () => {
    (await context.core).elasticsearch.client.asCurrentUser.indices.getDataStream = jest
      .fn()
      .mockResolvedValue({
        data_streams: [{ name: '.ds-1' }, { name: '.ds-2' }],
      });

    dataUsageService.getMetrics = jest.fn().mockResolvedValue({
      metrics: {
        ingest_rate: [
          {
            name: '.ds-1',
            data: [
              [1726858530000, 13756849],
              [1726862130000, 14657904],
            ],
          },
          {
            name: '.ds-2',
            data: [
              [1726858530000, 12894623],
              [1726862130000, 14436905],
            ],
          },
        ],
        storage_retained: [
          {
            name: '.ds-1',
            data: [
              [1726858530000, 12576413],
              [1726862130000, 13956423],
            ],
          },
          {
            name: '.ds-2',
            data: [
              [1726858530000, 12894623],
              [1726862130000, 14436905],
            ],
          },
        ],
      },
    });

    registerUsageMetricsRoute(router, mockedDataUsageContext);

    const mockRequest = httpServerMock.createKibanaRequest({
      body: {
        from: timeXMinutesAgo(15),
        to: timeXMinutesAgo(0),
        metricTypes: ['ingest_rate', 'storage_retained'],
        dataStreams: ['.ds-1', '.ds-2'],
      },
    });
    const mockResponse = httpServerMock.createResponseFactory();
    const mockRouter = mockCore.http.createRouter.mock.results[0].value;
    const [[, handler]] = mockRouter.versioned.post.mock.results[0].value.addVersion.mock.calls;
    await handler(context, mockRequest, mockResponse);

    expect(mockResponse.ok).toHaveBeenCalledTimes(1);
    expect(mockResponse.ok.mock.calls[0][0]).toEqual({
      body: {
        metrics: {
          ingest_rate: [
            {
              name: '.ds-1',
              data: [
                { x: 1726858530000, y: 13756849 },
                { x: 1726862130000, y: 14657904 },
              ],
            },
            {
              name: '.ds-2',
              data: [
                { x: 1726858530000, y: 12894623 },
                { x: 1726862130000, y: 14436905 },
              ],
            },
          ],
          storage_retained: [
            {
              name: '.ds-1',
              data: [
                { x: 1726858530000, y: 12576413 },
                { x: 1726862130000, y: 13956423 },
              ],
            },
            {
              name: '.ds-2',
              data: [
                { x: 1726858530000, y: 12894623 },
                { x: 1726862130000, y: 14436905 },
              ],
            },
          ],
        },
      },
    });
  });

  // TODO: fix this test
  it.skip('should throw error if error on requesting auto ops service', async () => {
    (await context.core).elasticsearch.client.asCurrentUser.indices.getDataStream = jest
      .fn()
      .mockResolvedValue({
        data_streams: [{ name: '.ds-1' }, { name: '.ds-2' }],
      });

    dataUsageService.getMetrics = jest
      .fn()
      .mockRejectedValue(new AutoOpsError('Uh oh, something went wrong!'));

    registerUsageMetricsRoute(router, mockedDataUsageContext);

    const mockRequest = httpServerMock.createKibanaRequest({
      body: {
        from: timeXMinutesAgo(15),
        to: timeXMinutesAgo(0),
        metricTypes: ['ingest_rate'],
        dataStreams: ['.ds-1', '.ds-2'],
      },
    });
    const mockResponse = httpServerMock.createResponseFactory();
    const mockRouter = mockCore.http.createRouter.mock.results[0].value;
    const [[, handler]] = mockRouter.versioned.post.mock.results[0].value.addVersion.mock.calls;
    await handler(context, mockRequest, mockResponse);

    expect(mockResponse.customError).toHaveBeenCalledTimes(1);
    expect(mockResponse.customError).toHaveBeenCalledWith({
      body: new AutoOpsError('Uh oh, something went wrong!'),
      statusCode: 503,
    });
  });
});
