/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { transformPartialUrlStateToFormState as transform } from './process_slo_form_values';

describe('Transform partial URL state into form state', () => {
  describe("with 'indicator' in URL state", () => {
    it('returns default form values when no indicator type is specified', () => {
      expect(transform({ indicator: { params: { index: 'my-index' } } })).toMatchSnapshot();
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
      ).toMatchSnapshot();
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
      ).toMatchSnapshot();
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
      ).toMatchSnapshot();
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
    ).toMatchSnapshot();
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
    ).toMatchSnapshot();
  });

  it("handles the 'budgetingMethod' URL state", () => {
    expect(transform({ budgetingMethod: 'timeslices' })).toMatchSnapshot();
  });

  it("handles the 'timeWindow' URL state", () => {
    expect(
      transform({ timeWindow: { duration: '1M', type: 'calendarAligned' } })
    ).toMatchSnapshot();
  });

  it("handles the 'objective' URL state", () => {
    expect(
      transform({ objective: { target: 0.945, timesliceTarget: 0.95, timesliceWindow: '2m' } })
    ).toMatchSnapshot();
  });
});
