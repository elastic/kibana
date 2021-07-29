/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as mocks from './test_mocks';
import { Comparator, Aggregators, MetricExpressionParams } from './types';
import { alertsMock, AlertServicesMock } from '../../../../../alerting/server/mocks';
import { previewMetricThresholdAlert } from './preview_metric_threshold_alert';
// eslint-disable-next-line @kbn/eslint/no-restricted-paths
import { elasticsearchClientMock } from 'src/core/server/elasticsearch/client/mocks';

describe('Previewing the metric threshold alert type', () => {
  describe('querying the entire infrastructure', () => {
    test('returns the expected results using a bucket interval equal to the alert interval', async () => {
      const [ungroupedResult] = await previewMetricThresholdAlert({
        ...baseParams,
        lookback: 'h',
        alertInterval: '1m',
        alertThrottle: '1m',
        alertOnNoData: true,
        alertNotifyWhen: 'onThrottleInterval',
      });
      const { fired, noData, error, notifications } = ungroupedResult;
      expect(fired).toBe(30);
      expect(noData).toBe(0);
      expect(error).toBe(0);
      expect(notifications).toBe(30);
    });

    test('returns the expected results using a bucket interval shorter than the alert interval', async () => {
      const [ungroupedResult] = await previewMetricThresholdAlert({
        ...baseParams,
        lookback: 'h',
        alertInterval: '3m',
        alertThrottle: '3m',
        alertOnNoData: true,
        alertNotifyWhen: 'onThrottleInterval',
      });
      const { fired, noData, error, notifications } = ungroupedResult;
      expect(fired).toBe(10);
      expect(noData).toBe(0);
      expect(error).toBe(0);
      expect(notifications).toBe(10);
    });
    test('returns the expected results using a bucket interval longer than the alert interval', async () => {
      const [ungroupedResult] = await previewMetricThresholdAlert({
        ...baseParams,
        lookback: 'h',
        alertInterval: '30s',
        alertThrottle: '30s',
        alertOnNoData: true,
        alertNotifyWhen: 'onThrottleInterval',
      });
      const { fired, noData, error, notifications } = ungroupedResult;
      expect(fired).toBe(60);
      expect(noData).toBe(0);
      expect(error).toBe(0);
      expect(notifications).toBe(60);
    });
    test('returns the expected results using a throttle interval longer than the alert interval', async () => {
      const [ungroupedResult] = await previewMetricThresholdAlert({
        ...baseParams,
        lookback: 'h',
        alertInterval: '1m',
        alertThrottle: '3m',
        alertOnNoData: true,
        alertNotifyWhen: 'onThrottleInterval',
      });
      const { fired, noData, error, notifications } = ungroupedResult;
      expect(fired).toBe(30);
      expect(noData).toBe(0);
      expect(error).toBe(0);
      expect(notifications).toBe(15);
    });
    test('returns the expected results using a notify setting of Only on Status Change', async () => {
      const [ungroupedResult] = await previewMetricThresholdAlert({
        ...baseParams,
        params: {
          ...baseParams.params,
          criteria: [
            {
              ...baseCriterion,
              metric: 'test.metric.3',
            } as MetricExpressionParams,
          ],
        },
        lookback: 'h',
        alertInterval: '1m',
        alertThrottle: '1m',
        alertOnNoData: true,
        alertNotifyWhen: 'onActionGroupChange',
      });
      const { fired, noData, error, notifications } = ungroupedResult;
      expect(fired).toBe(20);
      expect(noData).toBe(0);
      expect(error).toBe(0);
      expect(notifications).toBe(20);
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
        alertNotifyWhen: 'onThrottleInterval',
      });
      const {
        fired: firedA,
        noData: noDataA,
        error: errorA,
        notifications: notificationsA,
      } = resultA;
      expect(firedA).toBe(30);
      expect(noDataA).toBe(0);
      expect(errorA).toBe(0);
      expect(notificationsA).toBe(30);
      const {
        fired: firedB,
        noData: noDataB,
        error: errorB,
        notifications: notificationsB,
      } = resultB;
      expect(firedB).toBe(60);
      expect(noDataB).toBe(0);
      expect(errorB).toBe(0);
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
        alertNotifyWhen: 'onThrottleInterval',
      });
      const { fired, noData, error, notifications } = ungroupedResult;
      expect(fired).toBe(25);
      expect(noData).toBe(10);
      expect(error).toBe(0);
      expect(notifications).toBe(35);
    });
  });
});

const services: AlertServicesMock = alertsMock.createAlertServices();

services.scopedClusterClient.asCurrentUser.search.mockImplementation((params?: any): any => {
  const from = params?.body.query.bool.filter[0]?.range['@timestamp'].gte;
  const metric = params?.body.query.bool.filter[1]?.exists.field;
  if (params?.body.aggs.groupings) {
    if (params?.body.aggs.groupings.composite.after) {
      return elasticsearchClientMock.createSuccessTransportRequestPromise(
        mocks.compositeEndResponse
      );
    }
    return elasticsearchClientMock.createSuccessTransportRequestPromise(
      mocks.basicCompositePreviewResponse(from)
    );
  }
  if (metric === 'test.metric.2') {
    return elasticsearchClientMock.createSuccessTransportRequestPromise(
      mocks.alternateMetricPreviewResponse(from)
    );
  }
  if (metric === 'test.metric.3') {
    return elasticsearchClientMock.createSuccessTransportRequestPromise(
      mocks.repeatingMetricPreviewResponse(from)
    );
  }
  return elasticsearchClientMock.createSuccessTransportRequestPromise(
    mocks.basicMetricPreviewResponse(from)
  );
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
  esClient: services.scopedClusterClient.asCurrentUser,
  params: {
    criteria: [baseCriterion],
    groupBy: undefined,
    filterQuery: undefined,
  },
  config,
};
