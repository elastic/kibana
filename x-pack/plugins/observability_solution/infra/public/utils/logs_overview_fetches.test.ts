/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { CoreStart } from '@kbn/core/public';
import { coreMock } from '@kbn/core/public/mocks';
import { dataPluginMock } from '@kbn/data-plugin/public/mocks';
import { createResolvedLogViewMock } from '@kbn/logs-shared-plugin/common/mocks';
import { createLogsSharedPluginStartMock } from '@kbn/logs-shared-plugin/public/mocks';
import { of } from 'rxjs';
import { createInfraPluginStartMock } from '../mocks';
import { InfraClientStartDeps, InfraClientStartExports } from '../types';
import { getLogsHasDataFetcher, getLogsOverviewDataFetcher } from './logs_overview_fetchers';
import { sharePluginMock } from '@kbn/share-plugin/public/mocks';

const DEFAULT_PARAMS = {
  absoluteTime: { start: 1593430680000, end: 1593430800000 },
  relativeTime: { start: 'now-2m', end: 'now' }, // Doesn't matter for the test
  intervalString: '30s', // Doesn't matter for the test
  bucketSize: 30, // Doesn't matter for the test
};

function setup() {
  const core = coreMock.createStart();
  const data = dataPluginMock.createStartContract();
  const logsShared = createLogsSharedPluginStartMock();
  const pluginStart = createInfraPluginStartMock();
  const share = {
    url: {
      locators: {
        get: jest.fn(() => sharePluginMock.createLocator()),
      },
    },
  };
  const pluginDeps = { data, logsShared, share } as unknown as InfraClientStartDeps;

  const dataSearch = data.search.search as jest.MockedFunction<typeof data.search.search>;
  const getResolvedLogView = logsShared.logViews.client.getResolvedLogView as jest.MockedFunction<
    typeof logsShared.logViews.client.getResolvedLogView
  >;
  const getResolvedLogViewStatus = logsShared.logViews.client
    .getResolvedLogViewStatus as jest.MockedFunction<
    typeof logsShared.logViews.client.getResolvedLogViewStatus
  >;

  const mockedGetStartServices = jest.fn(() =>
    Promise.resolve<[CoreStart, InfraClientStartDeps, InfraClientStartExports]>([
      core,
      pluginDeps,
      pluginStart,
    ])
  );
  return {
    core,
    dataSearch,
    mockedGetStartServices,
    pluginDeps,
    pluginStart,
    getResolvedLogView,
    getResolvedLogViewStatus,
  };
}

describe('Logs UI Observability Homepage Functions', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getLogsHasDataFetcher()', () => {
    it('should return true when non-empty indices exist', async () => {
      const { mockedGetStartServices, pluginDeps, getResolvedLogView, getResolvedLogViewStatus } =
        setup();

      getResolvedLogView.mockResolvedValue(createResolvedLogViewMock({ indices: 'test-index' }));
      getResolvedLogViewStatus.mockResolvedValue({ index: 'available' });

      const hasData = getLogsHasDataFetcher(mockedGetStartServices);
      const response = await hasData();

      expect(pluginDeps.logsShared.logViews.client.getResolvedLogViewStatus).toHaveBeenCalledTimes(
        1
      );
      expect(response).toEqual({ hasData: true, indices: 'test-index' });
    });

    it('should return false when only empty indices exist', async () => {
      const { mockedGetStartServices, pluginDeps, getResolvedLogView, getResolvedLogViewStatus } =
        setup();

      getResolvedLogView.mockResolvedValue(createResolvedLogViewMock({ indices: 'test-index' }));
      getResolvedLogViewStatus.mockResolvedValue({ index: 'empty' });

      const hasData = getLogsHasDataFetcher(mockedGetStartServices);
      const response = await hasData();

      expect(pluginDeps.logsShared.logViews.client.getResolvedLogViewStatus).toHaveBeenCalledTimes(
        1
      );
      expect(response).toEqual({ hasData: false, indices: 'test-index' });
    });

    it('should return false when no index exists', async () => {
      const { mockedGetStartServices, pluginDeps, getResolvedLogView, getResolvedLogViewStatus } =
        setup();

      getResolvedLogView.mockResolvedValue(createResolvedLogViewMock({ indices: 'test-index' }));
      getResolvedLogViewStatus.mockResolvedValue({ index: 'missing' });

      const hasData = getLogsHasDataFetcher(mockedGetStartServices);
      const response = await hasData();

      expect(pluginDeps.logsShared.logViews.client.getResolvedLogViewStatus).toHaveBeenCalledTimes(
        1
      );
      expect(response).toEqual({ hasData: false, indices: 'test-index' });
    });
  });

  describe('getLogsOverviewDataFetcher()', () => {
    it('should work', async () => {
      const { mockedGetStartServices, dataSearch, getResolvedLogView } = setup();

      getResolvedLogView.mockResolvedValue(createResolvedLogViewMock());

      dataSearch.mockReturnValue(
        of({
          rawResponse: {
            aggregations: {
              stats: {
                buckets: [
                  {
                    key: 'nginx',
                    doc_count: 250, // Count is for 2 minutes
                    series: {
                      buckets: [
                        // Counts are per 30 seconds
                        { key: 1593430680000, doc_count: 25 },
                        { key: 1593430710000, doc_count: 50 },
                        { key: 1593430740000, doc_count: 75 },
                        { key: 1593430770000, doc_count: 100 },
                      ],
                    },
                  },
                ],
              },
            },
          },
        })
      );

      const fetchData = getLogsOverviewDataFetcher(mockedGetStartServices);
      const response = await fetchData(DEFAULT_PARAMS);

      expect(response).toMatchObject({
        stats: {
          nginx: {
            label: 'nginx',
            type: 'number',
            // Rate is normalized to logs in one minute
            value: 125,
          },
        },
        series: {
          nginx: {
            coordinates: [
              // Rates are normalized to logs in one minute
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
