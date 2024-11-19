/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getTopMetricsAggConfig } from './config';
import type { PivotAggsConfigTopMetrics } from './types';

describe('top metrics agg config', () => {
  let config: PivotAggsConfigTopMetrics;

  beforeEach(() => {
    config = getTopMetricsAggConfig({
      agg: 'top_metrics',
      aggName: 'test-agg',
      field: ['test-field'],
      dropDownName: 'test-agg',
    });
  });

  describe('#setUiConfigFromEs', () => {
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
        sortSettings: {
          order: 'asc',
        },
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
        sortSettings: {
          order: 'desc',
          mode: 'avg',
          nested: {
            path: 'offer',
            filter: {
              term: { 'offer.color': 'blue' },
            },
          },
        },
      });
    });
  });

  describe('#getEsAggConfig', () => {
    test('rejects invalid config', () => {
      // arrange
      config.field = ['field-01', 'field-02'];
      config.aggConfig = {
        sortSettings: {
          order: 'asc',
        },
      };

      // act and assert
      expect(config.getEsAggConfig()).toEqual(null);
    });

    test('rejects invalid config with missing sort direction', () => {
      // arrange
      config.field = ['field-01', 'field-02'];
      config.aggConfig = {
        sortField: 'sort-field',
      };

      // act and assert
      expect(config.getEsAggConfig()).toEqual(null);
    });

    test('converts valid config', () => {
      // arrange
      config.field = ['field-01', 'field-02'];
      config.aggConfig = {
        sortField: 'sort-field',
        sortSettings: {
          order: 'asc',
        },
      };

      // act and assert
      expect(config.getEsAggConfig()).toEqual({
        metrics: [{ field: 'field-01' }, { field: 'field-02' }],
        sort: {
          'sort-field': 'asc',
        },
      });
    });

    test('preserves unsupported config', () => {
      // arrange
      config.field = ['field-01', 'field-02'];

      config.aggConfig = {
        sortField: 'sort-field',
        sortSettings: {
          order: 'asc',
          // @ts-ignore
          nested: {
            path: 'order',
          },
        },
        // @ts-ignore
        size: 2,
      };

      // act and assert
      expect(config.getEsAggConfig()).toEqual({
        metrics: [{ field: 'field-01' }, { field: 'field-02' }],
        sort: {
          'sort-field': {
            order: 'asc',
            nested: {
              path: 'order',
            },
          },
        },
        size: 2,
      });
    });

    test('converts configs with a special sorting field', () => {
      // arrange
      config.field = ['field-01', 'field-02'];
      config.aggConfig = {
        sortField: '_score',
      };

      // act and assert
      expect(config.getEsAggConfig()).toEqual({
        metrics: [{ field: 'field-01' }, { field: 'field-02' }],
        sort: '_score',
      });
    });
  });
});
