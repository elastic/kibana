/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { coreMock } from 'src/core/public/mocks';
import { createMetricsHasData, createMetricsFetchData } from './metrics_overview_fetchers';
import { CoreStart } from 'kibana/public';
import { InfraClientStartDeps, InfraClientStartExports } from './types';
import moment from 'moment';
import { FAKE_OVERVIEW_RESPONSE } from './test_utils';

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
      core.http.post.mockResolvedValue(FAKE_OVERVIEW_RESPONSE);
      const fetchData = createMetricsFetchData(mockedGetStartServices);
      const endTime = moment('2020-07-02T13:25:11.629Z');
      const startTime = endTime.clone().subtract(1, 'h');
      const bucketSize = '300s';
      const response = await fetchData({
        absoluteTime: {
          start: startTime.valueOf(),
          end: endTime.valueOf(),
        },
        relativeTime: {
          start: 'now-15m',
          end: 'now',
        },
        bucketSize,
      });
      expect(core.http.post).toHaveBeenCalledTimes(1);
      expect(core.http.post).toHaveBeenCalledWith('/api/metrics/overview/top', {
        body: JSON.stringify({
          sourceId: 'default',
          bucketSize,
          size: 5,
          timerange: {
            from: startTime.valueOf(),
            to: endTime.valueOf(),
          },
        }),
      });
      expect(response).toMatchSnapshot();
    });
  });
});
