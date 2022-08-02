/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { errors } from '@elastic/elasticsearch';
import { lastValueFrom, of, throwError } from 'rxjs';
import {
  elasticsearchServiceMock,
  httpServerMock,
  savedObjectsClientMock,
  uiSettingsServiceMock,
} from '@kbn/core/server/mocks';
import {
  IEsSearchRequest,
  IEsSearchResponse,
  ISearchStrategy,
  SearchStrategyDependencies,
} from '@kbn/data-plugin/server';
import { createSearchSessionsClientMock } from '@kbn/data-plugin/server/search/mocks';
import { createResolvedLogViewMock } from '../../../common/log_views/resolved_log_view.mock';
import { createLogViewsClientMock } from '../log_views/log_views_client.mock';
import { createLogViewsServiceStartMock } from '../log_views/log_views_service.mock';
import {
  logEntriesSearchRequestStateRT,
  logEntriesSearchStrategyProvider,
} from './log_entries_search_strategy';

describe('LogEntries search strategy', () => {
  it('handles initial search requests', async () => {
    const esSearchStrategyMock = createEsSearchStrategyMock({
      id: 'ASYNC_REQUEST_ID',
      isRunning: true,
      rawResponse: {
        took: 0,
        _shards: { total: 1, failed: 0, skipped: 0, successful: 0 },
        timed_out: false,
        hits: { total: 0, max_score: 0, hits: [] },
      },
    });

    const dataMock = createDataPluginMock(esSearchStrategyMock);
    const logViewsClientMock = createLogViewsClientMock();
    logViewsClientMock.getResolvedLogView.mockResolvedValue(createResolvedLogViewMock());
    const logViewsMock = createLogViewsServiceStartMock();
    logViewsMock.getScopedClient.mockReturnValue(logViewsClientMock);
    const mockDependencies = createSearchStrategyDependenciesMock();

    const logEntriesSearchStrategy = logEntriesSearchStrategyProvider({
      data: dataMock,
      logViews: logViewsMock,
    });

    const response = await lastValueFrom(
      logEntriesSearchStrategy.search(
        {
          params: {
            sourceId: 'SOURCE_ID',
            startTimestamp: 100,
            endTimestamp: 200,
            size: 3,
          },
        },
        {},
        mockDependencies
      )
    );

    expect(logViewsMock.getScopedClient).toHaveBeenCalled();
    expect(logViewsClientMock.getResolvedLogView).toHaveBeenCalled();
    expect(esSearchStrategyMock.search).toHaveBeenCalledWith(
      expect.objectContaining({
        params: expect.objectContaining({
          index: 'log-indices-*',
          body: expect.objectContaining({
            fields: expect.arrayContaining(['event.dataset', 'message']),
            runtime_mappings: {
              runtime_field: {
                type: 'keyword',
                script: {
                  source: 'emit("runtime value")',
                },
              },
            },
          }),
        }),
      }),
      expect.anything(),
      expect.anything()
    );
    expect(response.id).toEqual(expect.any(String));
    expect(response.isRunning).toBe(true);
  });

  it('handles subsequent polling requests', async () => {
    const esSearchStrategyMock = createEsSearchStrategyMock({
      id: 'ASYNC_REQUEST_ID',
      isRunning: false,
      rawResponse: {
        took: 1,
        _shards: { total: 1, failed: 0, skipped: 0, successful: 1 },
        timed_out: false,
        hits: {
          total: 0,
          max_score: 0,
          hits: [
            {
              _id: 'HIT_ID',
              _index: 'HIT_INDEX',
              _score: 0,
              _source: null,
              fields: {
                '@timestamp': [1605116827143],
                'event.dataset': ['HIT_DATASET'],
                message: ['HIT_MESSAGE'],
                'container.id': ['HIT_CONTAINER_ID'],
              },
              sort: [1605116827143 as any, 1 as any], // incorrectly typed as string upstream
            },
          ],
        },
      },
    });
    const dataMock = createDataPluginMock(esSearchStrategyMock);
    const logViewsClientMock = createLogViewsClientMock();
    logViewsClientMock.getResolvedLogView.mockResolvedValue(createResolvedLogViewMock());
    const logViewsMock = createLogViewsServiceStartMock();
    logViewsMock.getScopedClient.mockReturnValue(logViewsClientMock);
    const mockDependencies = createSearchStrategyDependenciesMock();

    const logEntriesSearchStrategy = logEntriesSearchStrategyProvider({
      data: dataMock,
      logViews: logViewsMock,
    });
    const requestId = logEntriesSearchRequestStateRT.encode({
      esRequestId: 'ASYNC_REQUEST_ID',
    });

    const response = await lastValueFrom(
      logEntriesSearchStrategy.search(
        {
          id: requestId,
          params: {
            sourceId: 'SOURCE_ID',
            startTimestamp: 100,
            endTimestamp: 200,
            size: 3,
          },
        },
        {},
        mockDependencies
      )
    );

    expect(logViewsMock.getScopedClient).toHaveBeenCalled();
    expect(logViewsClientMock.getResolvedLogView).toHaveBeenCalled();
    expect(esSearchStrategyMock.search).toHaveBeenCalled();
    expect(response.id).toEqual(requestId);
    expect(response.isRunning).toBe(false);
    expect(response.rawResponse.data.entries).toEqual([
      {
        id: 'HIT_ID',
        index: 'HIT_INDEX',
        cursor: {
          time: 1605116827143,
          tiebreaker: 1,
        },
        columns: [
          {
            columnId: 'TIMESTAMP_COLUMN_ID',
            timestamp: 1605116827143,
          },
          {
            columnId: 'DATASET_COLUMN_ID',
            field: 'event.dataset',
            value: ['HIT_DATASET'],
            highlights: [],
          },
          {
            columnId: 'MESSAGE_COLUMN_ID',
            message: [
              {
                field: 'message',
                value: ['HIT_MESSAGE'],
                highlights: [],
              },
            ],
          },
        ],
        context: {
          'container.id': 'HIT_CONTAINER_ID',
        },
      },
    ]);
  });

  it('forwards errors from the underlying search strategy', async () => {
    const esSearchStrategyMock = createEsSearchStrategyMock({
      id: 'ASYNC_REQUEST_ID',
      isRunning: false,
      rawResponse: {
        took: 1,
        _shards: { total: 1, failed: 0, skipped: 0, successful: 1 },
        timed_out: false,
        hits: { total: 0, max_score: 0, hits: [] },
      },
    });
    const dataMock = createDataPluginMock(esSearchStrategyMock);
    const logViewsClientMock = createLogViewsClientMock();
    logViewsClientMock.getResolvedLogView.mockResolvedValue(createResolvedLogViewMock());
    const logViewsMock = createLogViewsServiceStartMock();
    logViewsMock.getScopedClient.mockReturnValue(logViewsClientMock);
    const mockDependencies = createSearchStrategyDependenciesMock();

    const logEntriesSearchStrategy = logEntriesSearchStrategyProvider({
      data: dataMock,
      logViews: logViewsMock,
    });

    const response = logEntriesSearchStrategy.search(
      {
        id: logEntriesSearchRequestStateRT.encode({ esRequestId: 'UNKNOWN_ID' }),
        params: {
          sourceId: 'SOURCE_ID',
          startTimestamp: 100,
          endTimestamp: 200,
          size: 3,
        },
      },
      {},
      mockDependencies
    );

    await expect(response.toPromise()).rejects.toThrowError(errors.ResponseError);
  });

  it('forwards cancellation to the underlying search strategy', async () => {
    const esSearchStrategyMock = createEsSearchStrategyMock({
      id: 'ASYNC_REQUEST_ID',
      isRunning: false,
      rawResponse: {
        took: 1,
        _shards: { total: 1, failed: 0, skipped: 0, successful: 1 },
        timed_out: false,
        hits: { total: 0, max_score: 0, hits: [] },
      },
    });
    const dataMock = createDataPluginMock(esSearchStrategyMock);
    const logViewsClientMock = createLogViewsClientMock();
    logViewsClientMock.getResolvedLogView.mockResolvedValue(createResolvedLogViewMock());
    const logViewsMock = createLogViewsServiceStartMock();
    logViewsMock.getScopedClient.mockReturnValue(logViewsClientMock);

    const mockDependencies = createSearchStrategyDependenciesMock();

    const logEntriesSearchStrategy = logEntriesSearchStrategyProvider({
      data: dataMock,
      logViews: logViewsMock,
    });
    const requestId = logEntriesSearchRequestStateRT.encode({
      esRequestId: 'ASYNC_REQUEST_ID',
    });

    await logEntriesSearchStrategy.cancel?.(requestId, {}, mockDependencies);

    expect(esSearchStrategyMock.cancel).toHaveBeenCalled();
  });
});

const createEsSearchStrategyMock = (esSearchResponse: IEsSearchResponse) => ({
  search: jest.fn((esSearchRequest: IEsSearchRequest) => {
    if (typeof esSearchRequest.id === 'string') {
      if (esSearchRequest.id === esSearchResponse.id) {
        return of(esSearchResponse);
      } else {
        return throwError(
          new errors.ResponseError({
            body: {},
            headers: {},
            meta: {} as any,
            statusCode: 404,
            warnings: [],
          })
        );
      }
    } else {
      return of(esSearchResponse);
    }
  }),
  cancel: jest.fn().mockResolvedValue(undefined),
});

const createSearchStrategyDependenciesMock = (): SearchStrategyDependencies => ({
  uiSettingsClient: uiSettingsServiceMock.createClient(),
  esClient: elasticsearchServiceMock.createScopedClusterClient(),
  savedObjectsClient: savedObjectsClientMock.create(),
  searchSessionsClient: createSearchSessionsClientMock(),
  request: httpServerMock.createKibanaRequest(),
});

// using the official data mock from within x-pack doesn't type-check successfully,
// because the `licensing` plugin modifies the `RequestHandlerContext` core type.
const createDataPluginMock = (esSearchStrategyMock: ISearchStrategy): any => ({
  search: {
    getSearchStrategy: jest.fn().mockReturnValue(esSearchStrategyMock),
  },
});
