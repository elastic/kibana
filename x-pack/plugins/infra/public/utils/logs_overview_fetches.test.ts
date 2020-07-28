/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { CoreStart } from 'kibana/public';
import { coreMock } from 'src/core/public/mocks';
import { dataPluginMock } from 'src/plugins/data/public/mocks';
import { callFetchLogSourceStatusAPI } from '../containers/logs/log_source/api/fetch_log_source_status';
import { InfraClientStartDeps, InfraClientStartExports } from '../types';
import { getLogsHasDataFetcher } from './logs_overview_fetchers';

jest.mock('../containers/logs/log_source/api/fetch_log_source_status');
const mockedCallFetchLogSourceStatusAPI = callFetchLogSourceStatusAPI as jest.MockedFunction<
  typeof callFetchLogSourceStatusAPI
>;

function setup() {
  const core = coreMock.createStart();
  const data = dataPluginMock.createStartContract();

  const mockedGetStartServices = jest.fn(() => {
    const deps = { data };
    return Promise.resolve([
      core as CoreStart,
      deps as InfraClientStartDeps,
      void 0 as InfraClientStartExports,
    ]) as Promise<[CoreStart, InfraClientStartDeps, InfraClientStartExports]>;
  });
  return { core, mockedGetStartServices };
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
    it.skip('should work', async () => {
      // Pending
    });
  });
});
