/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { coreMock } from 'src/core/public/mocks';
import { createMetricsHasData, createMetricsFetchData } from './metrics_overview_fetchers';
import { CoreStart } from 'kibana/public';
import { InfraClientStartDeps, InfraClientStartExports } from './types';
import moment from 'moment';
import { FAKE_SNAPSHOT_RESPONSE } from './test_utils';

function setup() {
  const core = coreMock.createStart();
  const mockedGetStartServices = jest.fn(() => {
    const deps = {};
    return Promise.resolve([
      core as CoreStart,
      deps as InfraClientStartDeps,
      void 0 as InfraClientStartExports,
    ]) as Promise<[CoreStart, InfraClientStartDeps, InfraClientStartExports]>;
  });
  return { core, mockedGetStartServices };
}

describe('Metrics UI Observability Homepage Functions', () => {
  describe('createMetricsHasData()', () => {
    it('should return true when true', async () => {
      const { core, mockedGetStartServices } = setup();
      core.http.get.mockResolvedValue({
        hasData: true,
      });
      const hasData = createMetricsHasData(mockedGetStartServices);
      const response = await hasData();
      expect(core.http.get).toHaveBeenCalledTimes(1);
      expect(response).toBeTruthy();
    });
    it('should return false when false', async () => {
      const { core, mockedGetStartServices } = setup();
      core.http.get.mockResolvedValue({
        hasData: false,
      });
      const hasData = createMetricsHasData(mockedGetStartServices);
      const response = await hasData();
      expect(core.http.get).toHaveBeenCalledTimes(1);
      expect(response).toBeFalsy();
    });
  });

  describe('createMetricsFetchData()', () => {
    it('should just work', async () => {
      const { core, mockedGetStartServices } = setup();
      core.http.post.mockResolvedValue(FAKE_SNAPSHOT_RESPONSE);
      const fetchData = createMetricsFetchData(mockedGetStartServices);
      const endTime = moment();
      const startTime = endTime.clone().subtract(1, 'h');
      const bucketSize = '300s';
      const response = await fetchData({
        startTime: startTime.toISOString(),
        endTime: endTime.toISOString(),
        bucketSize,
      });
      expect(core.http.post).toHaveBeenCalledTimes(1);
      expect(core.http.post).toHaveBeenCalledWith('/api/metrics/snapshot', {
        body: JSON.stringify({
          sourceId: 'default',
          metrics: [{ type: 'cpu' }, { type: 'memory' }, { type: 'rx' }, { type: 'tx' }],
          groupBy: [],
          nodeType: 'host',
          includeTimeseries: true,
          timerange: {
            from: startTime.valueOf(),
            to: endTime.valueOf(),
            interval: '300s',
            forceInterval: true,
            ignoreLookback: true,
          },
        }),
      });
      expect(response).toMatchSnapshot();
    });
  });
});
