/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { CoreStart } from 'kibana/public';
import { coreMock } from 'src/core/public/mocks';
import { dataPluginMock } from 'src/plugins/data/public/mocks';
import { callFetchLogSourceStatusAPI } from '../containers/logs/log_source/api/fetch_log_source_status';
import { callFetchLogSourceConfigurationAPI } from '../containers/logs/log_source/api/fetch_log_source_configuration';
import { InfraClientStartDeps, InfraClientStartExports } from '../types';
import { getLogsHasDataFetcher, getLogsOverviewDataFetcher } from './logs_overview_fetchers';
import { GetLogSourceConfigurationSuccessResponsePayload } from '../../common/http_api/log_sources/get_log_source_configuration';

jest.mock('../containers/logs/log_source/api/fetch_log_source_status');
const mockedCallFetchLogSourceStatusAPI = callFetchLogSourceStatusAPI as jest.MockedFunction<
  typeof callFetchLogSourceStatusAPI
>;

jest.mock('../containers/logs/log_source/api/fetch_log_source_configuration');
const mockedCallFetchLogSourceConfigurationAPI = callFetchLogSourceConfigurationAPI as jest.MockedFunction<
  typeof callFetchLogSourceConfigurationAPI
>;

const DEFAULT_PARAMS = {
  absoluteTime: { start: 1593430680000, end: 1593430800000 },
  relativeTime: { start: 'now-2m', end: 'now' }, // Doesn't matter for the test
  bucketSize: '30s', // Doesn't matter for the test
};

function setup() {
  const core = coreMock.createStart();
  const data = dataPluginMock.createStartContract();

  // `dataResponder.mockReturnValue()` will be the `response` in
  //
  //     const searcher = data.search.getSearchStrategy('sth');
  //     searcher.search(...).subscribe((**response**) => {});
  //
  const dataResponder = jest.fn();

  (data.search.search as jest.Mock).mockReturnValue({
    subscribe: (progress: Function, error: Function, finish: Function) => {
      progress(dataResponder());
      finish();
    },
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
      mockedCallFetchLogSourceStatusAPI.mockReset();
    });
    it('should return true when non-empty indices exist', async () => {
      const { mockedGetStartServices } = setup();

      mockedCallFetchLogSourceStatusAPI.mockResolvedValue({
        data: { logIndexFields: [], logIndexStatus: 'available' },
      });

      const hasData = getLogsHasDataFetcher(mockedGetStartServices);
      const response = await hasData();

      expect(mockedCallFetchLogSourceStatusAPI).toHaveBeenCalledTimes(1);
      expect(response).toBe(true);
    });

    it('should return false when only empty indices exist', async () => {
      const { mockedGetStartServices } = setup();

      mockedCallFetchLogSourceStatusAPI.mockResolvedValue({
        data: { logIndexFields: [], logIndexStatus: 'empty' },
      });

      const hasData = getLogsHasDataFetcher(mockedGetStartServices);
      const response = await hasData();

      expect(mockedCallFetchLogSourceStatusAPI).toHaveBeenCalledTimes(1);
      expect(response).toBe(false);
    });

    it('should return false when no index exists', async () => {
      const { mockedGetStartServices } = setup();

      mockedCallFetchLogSourceStatusAPI.mockResolvedValue({
        data: { logIndexFields: [], logIndexStatus: 'missing' },
      });

      const hasData = getLogsHasDataFetcher(mockedGetStartServices);
      const response = await hasData();

      expect(mockedCallFetchLogSourceStatusAPI).toHaveBeenCalledTimes(1);
      expect(response).toBe(false);
    });
  });

  describe('getLogsOverviewDataFetcher()', () => {
    beforeAll(() => {
      mockedCallFetchLogSourceConfigurationAPI.mockResolvedValue({
        data: {
          configuration: {
            logAlias: 'filebeat-*',
            fields: { timestamp: '@timestamp', tiebreaker: '_doc' },
          },
        },
      } as GetLogSourceConfigurationSuccessResponsePayload);
    });

    afterAll(() => {
      mockedCallFetchLogSourceConfigurationAPI.mockReset();
    });

    it('should work', async () => {
      const { mockedGetStartServices, dataResponder } = setup();

      dataResponder.mockReturnValue({
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
      });

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
