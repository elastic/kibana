/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getPercentilesAggConfig } from './config';
import type { IPivotAggsConfigPercentiles } from './types';
import { PERCENTILES_AGG_DEFAULT_PERCENTS } from '../../../../../../common';

describe('percentiles agg config', () => {
  let config: IPivotAggsConfigPercentiles;

  beforeEach(() => {
    config = getPercentilesAggConfig({
      agg: 'percentiles',
      aggName: 'test-agg',
      field: ['test-field'],
      dropDownName: 'test-agg',
    });
  });

  describe('#setUiConfigFromEs', () => {
    test('sets field and percents from ES config', () => {
      // act
      config.setUiConfigFromEs({
        field: 'test-field',
        percents: [10, 20, 30],
      });

      // assert
      expect(config.field).toEqual('test-field');
      expect(config.aggConfig).toEqual({ percents: [10, 20, 30] });
    });
  });

  describe('#getEsAggConfig', () => {
    test('returns null for invalid config', () => {
      // arrange
      config.aggConfig.percents = [150]; // invalid percentile value

      // act and assert
      expect(config.getEsAggConfig()).toBeNull();
    });

    test('returns valid config', () => {
      // arrange
      config.field = 'test-field';
      config.aggConfig.percents = [10, 20, 30];

      // act and assert
      expect(config.getEsAggConfig()).toEqual({
        field: 'test-field',
        percents: [10, 20, 30],
      });
    });

    test('returns default percents if none specified', () => {
      // arrange
      config.field = 'test-field';

      // act and assert
      expect(config.getEsAggConfig()).toEqual({
        field: 'test-field',
        percents: PERCENTILES_AGG_DEFAULT_PERCENTS,
      });
    });
  });

  describe('#isValid', () => {
    test('returns false for percentiles out of range', () => {
      // arrange
      config.aggConfig.percents = [150];

      // act and assert
      expect(config.isValid()).toBeFalsy();
      expect(config.errorMessageType).toBe('PERCENTILE_OUT_OF_RANGE');
    });

    test('returns false for invalid number format', () => {
      // arrrange
      config.aggConfig.pendingPercentileInput = 'invalid';

      // act and assert
      expect(config.isValid()).toBeFalsy();
      expect(config.errorMessageType).toBe('INVALID_FORMAT');
    });

    test('returns true for valid percents', () => {
      // arrange
      config.aggConfig.percents = [10, 20, 30];

      // act and assert
      expect(config.isValid()).toBeTruthy();
      expect(config.errorMessageType).toBeUndefined();
    });

    test('validates pending input along with existing percents', () => {
      // arrange
      config.aggConfig.percents = [10, 20, 30];
      config.aggConfig.pendingPercentileInput = '50';

      // act and assert
      expect(config.isValid()).toBeTruthy();
      expect(config.errorMessageType).toBeUndefined();
    });
  });
});
