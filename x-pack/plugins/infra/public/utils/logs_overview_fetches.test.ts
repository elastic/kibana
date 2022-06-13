/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { CoreStart } from 'kibana/public';
import { of } from 'rxjs';
import { coreMock } from 'src/core/public/mocks';
import { dataPluginMock } from 'src/plugins/data/public/mocks';
import { createResolvedLogViewMock } from '../../common/log_views/resolved_log_view.mock';
import { createInfraPluginStartMock } from '../mocks';
import { InfraClientStartDeps, InfraClientStartExports } from '../types';
import { getLogsHasDataFetcher, getLogsOverviewDataFetcher } from './logs_overview_fetchers';

const DEFAULT_PARAMS = {
  absoluteTime: { start: 1593430680000, end: 1593430800000 },
  relativeTime: { start: 'now-2m', end: 'now' }, // Doesn't matter for the test
  intervalString: '30s', // Doesn't matter for the test
  bucketSize: 30, // Doesn't matter for the test
};

function setup() {
  const core = coreMock.createStart();
  const data = dataPluginMock.createStartContract();
  const pluginStart = createInfraPluginStartMock();
  const pluginDeps = { data } as InfraClientStartDeps;

  const dataSearch = data.search.search as jest.MockedFunction<typeof data.search.search>;

  const mockedGetStartServices = jest.fn(() =>
    Promise.resolve<[CoreStart, InfraClientStartDeps, InfraClientStartExports]>([
      core,
      pluginDeps,
      pluginStart,
    ])
  );
  return { core, dataSearch, mockedGetStartServices, pluginStart };
}

describe('Logs UI Observability Homepage Functions', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getLogsHasDataFetcher()', () => {
    it('should return true when non-empty indices exist', async () => {
      const { mockedGetStartServices, pluginStart } = setup();

      pluginStart.logViews.client.getResolvedLogView.mockResolvedValue(
        createResolvedLogViewMock({ indices: 'test-index' })
      );
      pluginStart.logViews.client.getResolvedLogViewStatus.mockResolvedValue({
        index: 'available',
      });

      const hasData = getLogsHasDataFetcher(mockedGetStartServices);
      const response = await hasData();

      expect(pluginStart.logViews.client.getResolvedLogViewStatus).toHaveBeenCalledTimes(1);
      expect(response).toEqual({ hasData: true, indices: 'test-index' });
    });

    it('should return false when only empty indices exist', async () => {
      const { mockedGetStartServices, pluginStart } = setup();

      pluginStart.logViews.client.getResolvedLogView.mockResolvedValue(
        createResolvedLogViewMock({ indices: 'test-index' })
      );
      pluginStart.logViews.client.getResolvedLogViewStatus.mockResolvedValue({
        index: 'empty',
      });

      const hasData = getLogsHasDataFetcher(mockedGetStartServices);
      const response = await hasData();

      expect(pluginStart.logViews.client.getResolvedLogViewStatus).toHaveBeenCalledTimes(1);
      expect(response).toEqual({ hasData: false, indices: 'test-index' });
    });

    it('should return false when no index exists', async () => {
      const { mockedGetStartServices, pluginStart } = setup();

      pluginStart.logViews.client.getResolvedLogView.mockResolvedValue(
        createResolvedLogViewMock({ indices: 'test-index' })
      );
      pluginStart.logViews.client.getResolvedLogViewStatus.mockResolvedValue({
        index: 'missing',
      });

      const hasData = getLogsHasDataFetcher(mockedGetStartServices);
      const response = await hasData();

      expect(pluginStart.logViews.client.getResolvedLogViewStatus).toHaveBeenCalledTimes(1);
      expect(response).toEqual({ hasData: false, indices: 'test-index' });
    });
  });

  describe('getLogsOverviewDataFetcher()', () => {
    it('should work', async () => {
      const { mockedGetStartServices, dataSearch, pluginStart } = setup();

      pluginStart.logViews.client.getResolvedLogView.mockResolvedValue(createResolvedLogViewMock());

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
