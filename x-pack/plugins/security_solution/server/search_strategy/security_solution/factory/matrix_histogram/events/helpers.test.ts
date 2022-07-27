/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { BaseQuery } from './helpers';
import { buildThresholdTermsQuery, buildThresholdCardinalityQuery } from './helpers';

const BASE_QUERY: BaseQuery = {
  eventActionGroup: {
    terms: {
      order: {
        _count: 'desc',
      },
      size: 10,
    },
    aggs: {
      events: {
        date_histogram: {
          field: '@timestamp',
          fixed_interval: '5000ms',
          min_doc_count: 0,
          extended_bounds: {
            min: 1599581486215,
            max: 1599667886215,
          },
        },
      },
    },
  },
};

const STACK_BY_FIELD = 'event.action';

describe('buildEventsHistogramQuery - helpers', () => {
  describe('buildThresholdTermsQuery', () => {
    test('it builds a terms query using script if threshold field/s exist', () => {
      const query = buildThresholdTermsQuery({
        query: BASE_QUERY,
        fields: ['agent.name', 'host.name'],
        stackByField: STACK_BY_FIELD,
        missing: {},
      });
      expect(query).toEqual({
        eventActionGroup: {
          aggs: {
            events: {
              date_histogram: {
                extended_bounds: { max: 1599667886215, min: 1599581486215 },
                field: '@timestamp',
                fixed_interval: '5000ms',
                min_doc_count: 0,
              },
            },
          },
          terms: {
            order: { _count: 'desc' },
            script: {
              lang: 'painless',
              source: "doc['agent.name'].value + ':' + doc['host.name'].value",
            },
            size: 10,
          },
        },
      });
    });

    test('it builds a terms query using default stackByField if threshold field/s do not exist', () => {
      const query = buildThresholdTermsQuery({
        query: BASE_QUERY,
        fields: [],
        stackByField: STACK_BY_FIELD,
        missing: { missing: 'All others' },
      });
      expect(query).toEqual({
        eventActionGroup: {
          aggs: {
            events: {
              date_histogram: {
                extended_bounds: { max: 1599667886215, min: 1599581486215 },
                field: '@timestamp',
                fixed_interval: '5000ms',
                min_doc_count: 0,
              },
            },
          },
          terms: {
            field: 'event.action',
            missing: 'All others',
            order: { _count: 'desc' },
            size: 10,
          },
        },
      });
    });
  });

  describe('buildThresholdCardinalityQuery', () => {
    const TERMS_QUERY = {
      eventActionGroup: {
        terms: {
          field: 'host.name',
          order: { _count: 'desc' },
          size: 10,
          min_doc_count: 200,
        },
        aggs: {
          events: {
            date_histogram: {
              field: '@timestamp',
              fixed_interval: '2700000ms',
              min_doc_count: 0,
              extended_bounds: { min: 1599581486215, max: 1599667886215 },
            },
          },
        },
      },
    };

    test('it builds query with cardinality', () => {
      const query = buildThresholdCardinalityQuery({
        query: TERMS_QUERY,
        cardinalityField: 'agent.name',
        cardinalityValue: '100',
      });
      expect(query).toEqual({
        eventActionGroup: {
          aggs: {
            cardinality_check: {
              bucket_selector: {
                buckets_path: { cardinalityCount: 'cardinality_count' },
                script: 'params.cardinalityCount >= 100',
              },
            },
            cardinality_count: { cardinality: { field: 'agent.name' } },
            events: {
              date_histogram: {
                extended_bounds: { max: 1599667886215, min: 1599581486215 },
                field: '@timestamp',
                fixed_interval: '2700000ms',
                min_doc_count: 0,
              },
            },
          },
          terms: { field: 'host.name', min_doc_count: 200, order: { _count: 'desc' }, size: 10 },
        },
      });
    });

    test('it builds a terms query using default stackByField if threshold field/s do not exist', () => {
      const query = buildThresholdCardinalityQuery({
        query: TERMS_QUERY,
        cardinalityField: '',
        cardinalityValue: '',
      });
      expect(query).toEqual({
        eventActionGroup: {
          aggs: {
            events: {
              date_histogram: {
                extended_bounds: { max: 1599667886215, min: 1599581486215 },
                field: '@timestamp',
                fixed_interval: '2700000ms',
                min_doc_count: 0,
              },
            },
          },
          terms: { field: 'host.name', min_doc_count: 200, order: { _count: 'desc' }, size: 10 },
        },
      });
    });
  });
});
