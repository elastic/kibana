/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { of } from 'rxjs';
import {
  elasticsearchServiceMock,
  savedObjectsClientMock,
  uiSettingsServiceMock,
} from 'src/core/server/mocks';
import { IEsSearchResponse, SearchStrategyDependencies } from 'src/plugins/data/server';
import { dataPluginMock } from 'src/plugins/data/server/mocks';
import { createInfraSourcesMock } from '../../lib/sources/mocks';
import { logEntrySearchStrategyProvider } from './log_entry_search_strategy';

describe('LogEntry search strategy', () => {
  it('delegates to the enhanced ES search strategy', async () => {
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
    const dataMock = dataPluginMock.createStartContract();
    dataMock.search.getSearchStrategy.mockReturnValue(esSearchStrategyMock);
    const sourcesMock = createInfraSourcesMock();
    sourcesMock.getSourceConfiguration.mockResolvedValue(createSourceConfigurationMock());
    const mockDependencies: SearchStrategyDependencies = {
      uiSettingsClient: uiSettingsServiceMock.createClient(),
      esClient: elasticsearchServiceMock.createScopedClusterClient(),
      savedObjectsClient: savedObjectsClientMock.create(),
    };

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
  search: jest.fn(() => of(esSearchResponse)),
});
