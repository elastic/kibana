/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { coreMock } from 'src/core/public/mocks';
import { dataPluginMock } from 'src/plugins/data/public/mocks';
import { CoreStart } from 'kibana/public';
import { getLogsHasDataFetcher, getLogsOverviewDataFetcher } from './logs_overview_fetchers';
import { InfraClientStartDeps, InfraClientStartExports } from '../types';
import { callFetchLogSourceStatusAPI } from '../containers/logs/log_source/api/fetch_log_source_status';
import { callFetchLogSourceConfigurationAPI } from '../containers/logs/log_source/api/fetch_log_source_configuration';

// Note
// Calls to `.mock*` functions will fail the typecheck because how jest does the mocking.
// The calls will be preluded with a `@ts-expect-error`
jest.mock('../containers/logs/log_source/api/fetch_log_source_status');
jest.mock('../containers/logs/log_source/api/fetch_log_source_configuration');

function setup() {
  const core = coreMock.createStart();
  const data = dataPluginMock.createStartContract();

  // `dataResponder.mockReturnValue()` will be the `response` in
  //
  //     const searcher = data.search.getSearchStrategy('sth');
  //     searcher.search(...).subscribe((**response**) => {});
  //
  const dataResponder = jest.fn();

  (data.search.getSearchStrategy as jest.Mock).mockReturnValue({
    search: () => ({
      subscribe: (success: Function) => {
        success(dataResponder());
      },
    }),
  });

  const mockedGetStartServices = jest.fn(() => {
    const deps = { data };
    return Promise.resolve([
      core as CoreStart,
      deps as InfraClientStartDeps,
      void 0 as InfraClientStartExports,
    ]) as Promise<[CoreStart, InfraClientStartDeps, InfraClientStartExports]>;
  });
  return { core, mockedGetStartServices, dataResponder };
}

describe('Logs UI Observability Homepage Functions', () => {
  describe('getLogsHasDataFetcher()', () => {
    beforeEach(() => {
      // @ts-expect-error
      callFetchLogSourceStatusAPI.mockReset();
    });
    it('should return true when some index is present', async () => {
      const { mockedGetStartServices } = setup();

      // @ts-expect-error
      callFetchLogSourceStatusAPI.mockResolvedValue({
        data: { logIndexFields: [], logIndicesExist: true },
      });

      const hasData = getLogsHasDataFetcher(mockedGetStartServices);
      const response = await hasData();

      expect(callFetchLogSourceStatusAPI).toHaveBeenCalledTimes(1);
      expect(response).toBe(true);
    });

    it('should return false when no index is present', async () => {
      const { mockedGetStartServices } = setup();

      // @ts-expect-error
      callFetchLogSourceStatusAPI.mockResolvedValue({
        data: { logIndexFields: [], logIndicesExist: false },
      });

      const hasData = getLogsHasDataFetcher(mockedGetStartServices);
      const response = await hasData();

      expect(callFetchLogSourceStatusAPI).toHaveBeenCalledTimes(1);
      expect(response).toBe(false);
    });
  });

  describe('getLogsOverviewDataFetcher()', () => {
    it('should work', async () => {
      // Two minute range, to test the normalization
      const params = {
        startTime: '2020-06-29T11:38:00.000Z',
        endTime: '2020-06-29T11:40:00.000Z',
        bucketSize: '30s',
      };

      const { mockedGetStartServices, dataResponder } = setup();

      // @ts-expect-error
      callFetchLogSourceConfigurationAPI.mockResolvedValue({
        data: { configuration: { logAlias: 'filebeat', fields: { timestamp: '@timestamp' } } },
      });

      dataResponder.mockReturnValue({
        rawResponse: {
          aggregations: {
            stats: {
              // Stats are for two minutes. The normalized rate per minute will be half
              buckets: [{ key: 'nginx.access', doc_count: 100 }],
            },
            series: {
              // Buckets every 30 seconds. The normalized rate per minute will be double
              buckets: [
                {
                  key: 1593430680000,
                  dataset: { buckets: [{ key: 'nginx.access', doc_count: 25 }] },
                },
                {
                  key: 1593430710000,
                  dataset: { buckets: [{ key: 'nginx.access', doc_count: 50 }] },
                },
                {
                  key: 1593430740000,
                  dataset: { buckets: [{ key: 'nginx.access', doc_count: 75 }] },
                },
                {
                  key: 1593430770000,
                  dataset: { buckets: [{ key: 'nginx.access', doc_count: 100 }] },
                },
              ],
            },
          },
        },
      });

      const fetchData = getLogsOverviewDataFetcher(mockedGetStartServices);
      const response = await fetchData(params);

      expect(response).toMatchObject({
        title: 'Logs',
        appLink: `/app/logs/stream?logPosition=(end:'${params.endTime}',start:'${params.startTime}')`,
        stats: {
          'nginx.access': { label: 'nginx.access', type: 'number', value: 50 },
        },
        series: {
          'nginx.access': {
            label: 'nginx.access',
            coordinates: [
              { x: 1593430680000, y: 50 },
              { x: 1593430710000, y: 100 },
              { x: 1593430740000, y: 150 },
              { x: 1593430770000, y: 200 },
            ],
          },
        },
      });
    });
  });
});
