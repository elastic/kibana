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
      });
      const [firedResults, noDataResults, errorResults] = ungroupedResult;
      expect(firedResults).toBe(30);
      expect(noDataResults).toBe(0);
      expect(errorResults).toBe(0);
    });

    test('returns the expected results using a bucket interval shorter than the alert interval', async () => {
      const [ungroupedResult] = await previewMetricThresholdAlert({
        ...baseParams,
        lookback: 'h',
        alertInterval: '3m',
      });
      const [firedResults, noDataResults, errorResults] = ungroupedResult;
      expect(firedResults).toBe(10);
      expect(noDataResults).toBe(0);
      expect(errorResults).toBe(0);
    });
    test('returns the expected results using a bucket interval longer than the alert interval', async () => {
      const [ungroupedResult] = await previewMetricThresholdAlert({
        ...baseParams,
        lookback: 'h',
        alertInterval: '30s',
      });
      const [firedResults, noDataResults, errorResults] = ungroupedResult;
      expect(firedResults).toBe(60);
      expect(noDataResults).toBe(0);
      expect(errorResults).toBe(0);
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
      });
      const [firedResultsA, noDataResultsA, errorResultsA] = resultA;
      expect(firedResultsA).toBe(30);
      expect(noDataResultsA).toBe(0);
      expect(errorResultsA).toBe(0);
      const [firedResultsB, noDataResultsB, errorResultsB] = resultB;
      expect(firedResultsB).toBe(60);
      expect(noDataResultsB).toBe(0);
      expect(errorResultsB).toBe(0);
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
      });
      const [firedResults, noDataResults, errorResults] = ungroupedResult;
      expect(firedResults).toBe(25);
      expect(noDataResults).toBe(10);
      expect(errorResults).toBe(0);
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
