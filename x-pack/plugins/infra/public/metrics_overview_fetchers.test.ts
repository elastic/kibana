/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { CoreStart } from 'kibana/public';
import moment from 'moment';
import { coreMock } from 'src/core/public/mocks';
import { createMetricsFetchData, createMetricsHasData } from './metrics_overview_fetchers';
import { createInfraPluginStartMock } from './mocks';
import { FAKE_OVERVIEW_RESPONSE } from './test_utils';
import { InfraClientStartDeps, InfraClientStartExports } from './types';

function setup() {
  const core = coreMock.createStart();
  const pluginStart = createInfraPluginStartMock();

  const mockedGetStartServices = jest.fn(() => {
    const deps = {};
    return Promise.resolve([
      core as CoreStart,
      deps as InfraClientStartDeps,
      pluginStart,
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
        configuration: {
          metricAlias: 'metric-*',
        },
      });
      const hasData = createMetricsHasData(mockedGetStartServices);
      const response = await hasData();
      expect(core.http.get).toHaveBeenCalledTimes(1);
      expect(response.hasData).toBeTruthy();
    });
    it('should return false when false', async () => {
      const { core, mockedGetStartServices } = setup();
      core.http.get.mockResolvedValue({
        hasData: false,
        configuration: {
          metricAlias: 'metric-*',
        },
      });
      const hasData = createMetricsHasData(mockedGetStartServices);
      const response = await hasData();
      expect(core.http.get).toHaveBeenCalledTimes(1);
      expect(response.hasData).toBeFalsy();
    });
  });

  describe('createMetricsFetchData()', () => {
    it('should just work', async () => {
      const { core, mockedGetStartServices } = setup();
      core.http.post.mockResolvedValue(FAKE_OVERVIEW_RESPONSE);
      const fetchData = createMetricsFetchData(mockedGetStartServices);
      const endTime = moment('2020-07-02T13:25:11.629Z');
      const startTime = endTime.clone().subtract(1, 'h');
      const bucketSize = 300;
      const intervalString = '300s';
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
        intervalString,
      });
      expect(core.http.post).toHaveBeenCalledTimes(1);
      expect(core.http.post).toHaveBeenCalledWith('/api/metrics/overview/top', {
        body: JSON.stringify({
          sourceId: 'default',
          bucketSize: intervalString,
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
