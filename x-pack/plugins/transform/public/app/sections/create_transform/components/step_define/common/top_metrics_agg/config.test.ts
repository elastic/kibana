/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getTopMetricsAggConfig } from './config';
import { PivotAggsConfigTopMetrics } from './types';

describe('top metrics agg config', () => {
  describe('#setUiConfigFromEs', () => {
    let config: PivotAggsConfigTopMetrics;

    beforeEach(() => {
      config = getTopMetricsAggConfig({
        agg: 'top_metrics',
        aggName: 'test-agg',
        field: ['test-field'],
        dropDownName: 'test-agg',
      });
    });

    test('sets config with a special field', () => {
      // act
      config.setUiConfigFromEs({
        metrics: {
          field: 'test-field-01',
        },
        sort: '_score',
      });

      // assert
      expect(config.field).toEqual(['test-field-01']);
      expect(config.aggConfig).toEqual({
        sortField: '_score',
      });
    });

    test('sets config with a simple sort direction definition', () => {
      // act
      config.setUiConfigFromEs({
        metrics: [
          {
            field: 'test-field-01',
          },
          {
            field: 'test-field-02',
          },
        ],
        sort: {
          'sort-field': 'asc',
        },
      });

      // assert
      expect(config.field).toEqual(['test-field-01', 'test-field-02']);
      expect(config.aggConfig).toEqual({
        sortField: 'sort-field',
        sortDirection: 'asc',
      });
    });

    test('sets config with a sort definition params not supported by the UI', () => {
      // act
      config.setUiConfigFromEs({
        metrics: [
          {
            field: 'test-field-01',
          },
        ],
        sort: {
          'offer.price': {
            order: 'desc',
            mode: 'avg',
            nested: {
              path: 'offer',
              filter: {
                term: { 'offer.color': 'blue' },
              },
            },
          },
        },
      });

      // assert
      expect(config.field).toEqual(['test-field-01']);
      expect(config.aggConfig).toEqual({
        sortField: 'offer.price',
        sortDirection: 'desc',
        sortMode: 'avg',
        nested: {
          path: 'offer',
          filter: {
            term: { 'offer.color': 'blue' },
          },
        },
      });
    });
  });
});
