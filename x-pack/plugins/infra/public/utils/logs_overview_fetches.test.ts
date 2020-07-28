/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { coreMock } from 'src/core/public/mocks';
import { dataPluginMock } from 'src/plugins/data/public/mocks';
import { CoreStart } from 'kibana/public';
import { getLogsHasDataFetcher } from './logs_overview_fetchers';
import { InfraClientStartDeps, InfraClientStartExports } from '../types';
import { callFetchLogSourceStatusAPI } from '../containers/logs/log_source/api/fetch_log_source_status';

// Note
// Calls to `.mock*` functions will fail the typecheck because how jest does the mocking.
// The calls will be preluded with a `@ts-expect-error`
jest.mock('../containers/logs/log_source/api/fetch_log_source_status');

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
    it.skip('should work', async () => {
      // Pending
    });
  });
});
