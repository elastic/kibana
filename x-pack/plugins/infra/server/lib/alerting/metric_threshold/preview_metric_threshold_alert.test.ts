/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import * as mocks from './test_mocks';
import { Comparator, Aggregators, MetricExpressionParams } from './types';
import { alertsMock, AlertServicesMock } from '../../../../../alerts/server/mocks';
import { previewMetricThresholdAlert } from './preview_metric_threshold_alert';

describe('Previewing the metric threshold alert type', () => {
  describe('querying the entire infrastructure', () => {
    test('returns the expected results using a bucket interval equal to the alert interval', async () => {
      const [ungroupedResult] = await previewMetricThresholdAlert({
        ...baseParams,
        lookback: 'h',
        alertInterval: '1m',
        alertThrottle: '1m',
        alertOnNoData: true,
      });
      const [firedResults, noDataResults, errorResults, notifications] = ungroupedResult;
      expect(firedResults).toBe(30);
      expect(noDataResults).toBe(0);
      expect(errorResults).toBe(0);
      expect(notifications).toBe(30);
    });

    test('returns the expected results using a bucket interval shorter than the alert interval', async () => {
      const [ungroupedResult] = await previewMetricThresholdAlert({
        ...baseParams,
        lookback: 'h',
        alertInterval: '3m',
        alertThrottle: '3m',
        alertOnNoData: true,
      });
      const [firedResults, noDataResults, errorResults, notifications] = ungroupedResult;
      expect(firedResults).toBe(10);
      expect(noDataResults).toBe(0);
      expect(errorResults).toBe(0);
      expect(notifications).toBe(10);
    });
    test('returns the expected results using a bucket interval longer than the alert interval', async () => {
      const [ungroupedResult] = await previewMetricThresholdAlert({
        ...baseParams,
        lookback: 'h',
        alertInterval: '30s',
        alertThrottle: '30s',
        alertOnNoData: true,
      });
      const [firedResults, noDataResults, errorResults, notifications] = ungroupedResult;
      expect(firedResults).toBe(60);
      expect(noDataResults).toBe(0);
      expect(errorResults).toBe(0);
      expect(notifications).toBe(60);
    });
    test('returns the expected results using a throttle interval longer than the alert interval', async () => {
      const [ungroupedResult] = await previewMetricThresholdAlert({
        ...baseParams,
        lookback: 'h',
        alertInterval: '1m',
        alertThrottle: '3m',
        alertOnNoData: true,
      });
      const [firedResults, noDataResults, errorResults, notifications] = ungroupedResult;
      expect(firedResults).toBe(30);
      expect(noDataResults).toBe(0);
      expect(errorResults).toBe(0);
      expect(notifications).toBe(15);
    });
  });
  describe('querying with a groupBy parameter', () => {
    test('returns the expected results', async () => {
      const [resultA, resultB] = await previewMetricThresholdAlert({
        ...baseParams,
        params: {
          ...baseParams.params,
          groupBy: ['something'],
        },
        lookback: 'h',
        alertInterval: '1m',
        alertThrottle: '1m',
        alertOnNoData: true,
      });
      const [firedResultsA, noDataResultsA, errorResultsA, notificationsA] = resultA;
      expect(firedResultsA).toBe(30);
      expect(noDataResultsA).toBe(0);
      expect(errorResultsA).toBe(0);
      expect(notificationsA).toBe(30);
      const [firedResultsB, noDataResultsB, errorResultsB, notificationsB] = resultB;
      expect(firedResultsB).toBe(60);
      expect(noDataResultsB).toBe(0);
      expect(errorResultsB).toBe(0);
      expect(notificationsB).toBe(60);
    });
  });
  describe('querying a data set with a period of No Data', () => {
    test('returns the expected results', async () => {
      const [ungroupedResult] = await previewMetricThresholdAlert({
        ...baseParams,
        params: {
          ...baseParams.params,
          criteria: [
            {
              ...baseCriterion,
              metric: 'test.metric.2',
            } as MetricExpressionParams,
          ],
        },
        lookback: 'h',
        alertInterval: '1m',
        alertThrottle: '1m',
        alertOnNoData: true,
      });
      const [firedResults, noDataResults, errorResults, notifications] = ungroupedResult;
      expect(firedResults).toBe(25);
      expect(noDataResults).toBe(10);
      expect(errorResults).toBe(0);
      expect(notifications).toBe(35);
    });
  });
});

const services: AlertServicesMock = alertsMock.createAlertServices();
services.callCluster.mockImplementation(async (_: string, { body, index }: any) => {
  const metric = body.query.bool.filter[1]?.exists.field;
  if (body.aggs.groupings) {
    if (body.aggs.groupings.composite.after) {
      return mocks.compositeEndResponse;
    }
    return mocks.basicCompositePreviewResponse;
  }
  if (metric === 'test.metric.2') {
    return mocks.alternateMetricPreviewResponse;
  }
  return mocks.basicMetricPreviewResponse;
});

const baseCriterion = {
  aggType: Aggregators.AVERAGE,
  metric: 'test.metric.1',
  timeSize: 1,
  timeUnit: 'm',
  comparator: Comparator.GT,
  threshold: [0.75],
} as MetricExpressionParams;

const config = {
  metricAlias: 'metricbeat-*',
  fields: {
    timefield: '@timestamp',
  },
} as any;

const baseParams = {
  callCluster: services.callCluster,
  params: {
    criteria: [baseCriterion],
    groupBy: undefined,
    filterQuery: undefined,
  },
  config,
};
