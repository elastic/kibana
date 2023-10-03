/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { transformPartialUrlStateToFormState as transform } from './process_slo_form_values';

describe('Transform Partial URL State into partial State Form', () => {
  describe('indicators', () => {
    it("returns an empty '{}' when no indicator type is specified", () => {
      expect(transform({ indicator: { params: { index: 'my-index' } } })).toEqual({});
    });

    it('handles partial APM Availability state', () => {
      expect(
        transform({
          indicator: {
            type: 'sli.apm.transactionErrorRate',
            params: {
              service: 'override-service',
            },
          },
        })
      ).toEqual({
        indicator: {
          type: 'sli.apm.transactionErrorRate',
          params: {
            service: 'override-service',
            environment: '',
            filter: '',
            index: '',
            transactionName: '',
            transactionType: '',
          },
        },
      });
    });

    it('handles partial APM Latency state', () => {
      expect(
        transform({
          indicator: {
            type: 'sli.apm.transactionDuration',
            params: {
              service: 'override-service',
            },
          },
        })
      ).toEqual({
        indicator: {
          type: 'sli.apm.transactionDuration',
          params: {
            service: 'override-service',
            environment: '',
            filter: '',
            index: '',
            transactionName: '',
            transactionType: '',
            threshold: 250,
          },
        },
      });
    });

    it('handles partial Custom KQL state', () => {
      expect(
        transform({
          indicator: {
            type: 'sli.kql.custom',
            params: {
              good: "some.override.filter:'foo'",
              index: 'override-index',
            },
          },
        })
      ).toEqual({
        indicator: {
          type: 'sli.kql.custom',
          params: {
            index: 'override-index',
            timestampField: '',
            filter: '',
            good: "some.override.filter:'foo'",
            total: '',
          },
        },
      });
    });

    it('handles partial Custom Metric state', () => {
      expect(
        transform({
          indicator: {
            type: 'sli.metric.custom',
            params: {
              index: 'override-index',
            },
          },
        })
      ).toEqual({
        indicator: {
          type: 'sli.metric.custom',
          params: {
            index: 'override-index',
            filter: '',
            timestampField: '',
            good: {
              equation: 'A',
              metrics: [{ aggregation: 'sum', field: '', name: 'A' }],
            },
            total: {
              equation: 'A',
              metrics: [{ aggregation: 'sum', field: '', name: 'A' }],
            },
          },
        },
      });
    });

    it('handles partial Custom Histogram state', () => {
      expect(
        transform({
          indicator: {
            type: 'sli.histogram.custom',
            params: {
              index: 'override-index',
            },
          },
        })
      ).toEqual({
        indicator: {
          type: 'sli.histogram.custom',
          params: {
            index: 'override-index',
            filter: '',
            timestampField: '',
            good: {
              aggregation: 'value_count',
              field: '',
            },
            total: {
              aggregation: 'value_count',
              field: '',
            },
          },
        },
      });
    });
  });
});
