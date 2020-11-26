/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { ResponseError } from '@elastic/elasticsearch/lib/errors';
import { of, throwError } from 'rxjs';
import {
  elasticsearchServiceMock,
  savedObjectsClientMock,
  uiSettingsServiceMock,
} from 'src/core/server/mocks';
import {
  IEsSearchRequest,
  IEsSearchResponse,
  ISearchStrategy,
  SearchStrategyDependencies,
} from 'src/plugins/data/server';
import { createInfraSourcesMock } from '../../lib/sources/mocks';
import {
  logEntrySearchRequestStateRT,
  logEntrySearchStrategyProvider,
} from './log_entry_search_strategy';

describe('LogEntry search strategy', () => {
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
    const sourcesMock = createInfraSourcesMock();
    sourcesMock.getSourceConfiguration.mockResolvedValue(createSourceConfigurationMock());
    const mockDependencies = createSearchStrategyDependenciesMock();

    const logEntrySearchStrategy = logEntrySearchStrategyProvider({
      data: dataMock,
      sources: sourcesMock,
    });

    const response = await logEntrySearchStrategy
      .search(
        {
          params: { sourceId: 'SOURCE_ID', logEntryId: 'LOG_ENTRY_ID' },
        },
        {},
        mockDependencies
      )
      .toPromise();

    expect(sourcesMock.getSourceConfiguration).toHaveBeenCalled();
    expect(esSearchStrategyMock.search).toHaveBeenCalled();
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
              _type: '_doc',
              _score: 0,
              _source: null,
              fields: {
                '@timestamp': [1605116827143],
                message: ['HIT_MESSAGE'],
              },
              sort: [1605116827143 as any, 1 as any], // incorrectly typed as string upstream
            },
          ],
        },
      },
    });
    const dataMock = createDataPluginMock(esSearchStrategyMock);
    const sourcesMock = createInfraSourcesMock();
    sourcesMock.getSourceConfiguration.mockResolvedValue(createSourceConfigurationMock());
    const mockDependencies = createSearchStrategyDependenciesMock();

    const logEntrySearchStrategy = logEntrySearchStrategyProvider({
      data: dataMock,
      sources: sourcesMock,
    });
    const requestId = logEntrySearchRequestStateRT.encode({
      esRequestId: 'ASYNC_REQUEST_ID',
    });

    const response = await logEntrySearchStrategy
      .search(
        {
          id: requestId,
          params: { sourceId: 'SOURCE_ID', logEntryId: 'LOG_ENTRY_ID' },
        },
        {},
        mockDependencies
      )
      .toPromise();

    expect(sourcesMock.getSourceConfiguration).not.toHaveBeenCalled();
    expect(esSearchStrategyMock.search).toHaveBeenCalled();
    expect(response.id).toEqual(requestId);
    expect(response.isRunning).toBe(false);
    expect(response.rawResponse.data).toEqual({
      id: 'HIT_ID',
      index: 'HIT_INDEX',
      key: {
        time: 1605116827143,
        tiebreaker: 1,
      },
      fields: [
        { field: '@timestamp', value: [1605116827143] },
        { field: 'message', value: ['HIT_MESSAGE'] },
      ],
    });
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
    const sourcesMock = createInfraSourcesMock();
    sourcesMock.getSourceConfiguration.mockResolvedValue(createSourceConfigurationMock());
    const mockDependencies = createSearchStrategyDependenciesMock();

    const logEntrySearchStrategy = logEntrySearchStrategyProvider({
      data: dataMock,
      sources: sourcesMock,
    });

    const response = logEntrySearchStrategy.search(
      {
        id: logEntrySearchRequestStateRT.encode({ esRequestId: 'UNKNOWN_ID' }),
        params: { sourceId: 'SOURCE_ID', logEntryId: 'LOG_ENTRY_ID' },
      },
      {},
      mockDependencies
    );

    await expect(response.toPromise()).rejects.toThrowError(ResponseError);
  });
});

const createSourceConfigurationMock = () => ({
  id: 'SOURCE_ID',
  origin: 'stored' as const,
  configuration: {
    name: 'SOURCE_NAME',
    description: 'SOURCE_DESCRIPTION',
    logAlias: 'log-indices-*',
    metricAlias: 'metric-indices-*',
    inventoryDefaultView: 'DEFAULT_VIEW',
    metricsExplorerDefaultView: 'DEFAULT_VIEW',
    logColumns: [],
    fields: {
      pod: 'POD_FIELD',
      host: 'HOST_FIELD',
      container: 'CONTAINER_FIELD',
      message: ['MESSAGE_FIELD'],
      timestamp: 'TIMESTAMP_FIELD',
      tiebreaker: 'TIEBREAKER_FIELD',
    },
  },
});

const createEsSearchStrategyMock = (esSearchResponse: IEsSearchResponse) => ({
  search: jest.fn((esSearchRequest: IEsSearchRequest) => {
    if (typeof esSearchRequest.id === 'string') {
      if (esSearchRequest.id === esSearchResponse.id) {
        return of(esSearchResponse);
      } else {
        return throwError(
          new ResponseError({
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
});

const createSearchStrategyDependenciesMock = (): SearchStrategyDependencies => ({
  uiSettingsClient: uiSettingsServiceMock.createClient(),
  esClient: elasticsearchServiceMock.createScopedClusterClient(),
  savedObjectsClient: savedObjectsClientMock.create(),
});

// using the official data mock from within x-pack doesn't type-check successfully,
// because the `licensing` plugin modifies the `RequestHandlerContext` core type.
const createDataPluginMock = (esSearchStrategyMock: ISearchStrategy): any => ({
  search: {
    getSearchStrategy: jest.fn().mockReturnValue(esSearchStrategyMock),
  },
});
