/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { QuotaMetric } from '../';

describe('Quota Metric Calculation', () => {
  it('When bucket is invalid, returns undefined', () => {
    const myQuotaMetric = new QuotaMetric({
      field: 'cpu_field',
      label: 'cpu_label',
      description: 'cpu_description',
      type: 'node',
      app: 'elasticsearch',
      uuidField: 'cluster_uuid',
      timestampField: 'timestamp',
    });
    expect(myQuotaMetric.calculation()).toBe(null);
  });

  it('When bucket has valid Δusage, Δperiods, and quota', () => {
    const myQuotaMetric = new QuotaMetric({
      field: 'cpu_field',
      label: 'cpu_label',
      description: 'cpu_description',
      type: 'node',
      app: 'elasticsearch',
      uuidField: 'cluster_uuid',
      timestampField: 'timestamp',
    });
    expect(
      myQuotaMetric.calculation({
        quota: { value: 10 },
        usage_deriv: { normalized_value: 1000 },
        periods_deriv: { normalized_value: 10 },
        metric: { value: Infinity }, // is the val for normal CPU usage, won't be used
      })
    ).toBe(1);
  });

  it('When bucket has not valid Δusage, Δperiods, and quota', () => {
    const myQuotaMetric = new QuotaMetric({
      field: 'cpu_field',
      label: 'cpu_label',
      description: 'cpu_description',
      type: 'node',
      app: 'elasticsearch',
      uuidField: 'cluster_uuid',
      timestampField: 'timestamp',
    });
    expect(
      myQuotaMetric.calculation({
        quota: { value: null },
        usage_deriv: { normalized_value: null },
        periods_deriv: { normalized_value: null },
        metric: { value: Infinity }, // is the val for normal CPU usage, will be taken as return value
      })
    ).toBe(null);
  });
});
