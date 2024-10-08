/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { MetricsUIAggregation } from '@kbn/metrics-data-access-plugin/common';
import { isCustomMetricRate, isInterfaceRateAgg, isMetricRate, isRate } from './is_rate';
import { SnapshotCustomMetricInput } from '../../../../../common/http_api';

const customMaxMetricMock: SnapshotCustomMetricInput = {
  type: 'custom',
  aggregation: 'max',
  field: '',
  id: '',
};

const customRateMetricMock: SnapshotCustomMetricInput = {
  type: 'custom',
  aggregation: 'rate',
  field: '',
  id: '',
};

const metricMock: MetricsUIAggregation = {
  mock1: { derivative: {} },
  mock2: { max: null, mock: { field: '' } },
  mock3: {
    aggregations: {},
    terms: {},
    sum_bucket: {},
  },
};

describe('isRate', () => {
  describe('isMetricRate', () => {
    it('should return false when metric is undefined', () => {
      expect(isMetricRate(undefined)).toEqual(false);
    });
    it('should return true when correct metric is passed', () => {
      expect(isMetricRate(metricMock)).toEqual(true);
    });
  });

  describe('isCustomMetricRate', () => {
    it("should return false when aggregation isn't 'rate'", () => {
      expect(isCustomMetricRate(customMaxMetricMock)).toEqual(false);
    });
    it("should return true when aggregation is equal to 'rate'", () => {
      expect(isCustomMetricRate(customRateMetricMock)).toEqual(true);
    });

    describe('isInterfaceRateAgg', () => {
      it('should return false if metric is undefined', () => {
        expect(isInterfaceRateAgg(undefined)).toEqual(false);
      });
      it('should return true when correct metric is passed', () => {
        expect(isInterfaceRateAgg(metricMock)).toEqual(true);
      });
    });

    describe('isRate', () => {
      it('should return false when incorrect metrics are provided', () => {
        expect(isRate({} as MetricsUIAggregation, {} as SnapshotCustomMetricInput)).toEqual(false);
      });

      it('should return true when proper metric are provided', () => {
        expect(isRate(metricMock, customRateMetricMock)).toEqual(true);
      });
    });
  });
});
