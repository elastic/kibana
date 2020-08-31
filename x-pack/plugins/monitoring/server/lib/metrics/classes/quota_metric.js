/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { get } from 'lodash';
import { Metric } from './metric';
import { LARGE_FLOAT } from '../../../../common/formatting';
import { NORMALIZED_DERIVATIVE_UNIT } from '../../../../common/constants';

export class QuotaMetric extends Metric {
  constructor(opts) {
    super({
      ...opts,
      format: LARGE_FLOAT,
      metricAgg: 'max', // makes an average metric of `this.field`, which is the "actual cpu utilization"
      derivative: true,
      units: '%',
    });

    this.aggs = {
      usage: {
        max: { field: `${this.fieldSource}.${this.usageField}` },
      },
      periods: {
        max: { field: `${this.fieldSource}.${this.periodsField}` },
      },
      quota: {
        // Use min for this value. Basically environment to max, but picks -1
        // as the value if quota is disabled in one of the docs, which affects
        // the logic by routing to the non-quota scenario
        min: {
          field: `${this.fieldSource}.${this.quotaField}`,
        },
      },
      usage_deriv: {
        derivative: {
          buckets_path: 'usage',
          gap_policy: 'skip',
          unit: NORMALIZED_DERIVATIVE_UNIT,
        },
      },
      periods_deriv: {
        derivative: {
          buckets_path: 'periods',
          gap_policy: 'skip',
          unit: NORMALIZED_DERIVATIVE_UNIT,
        },
      },
    };

    this.calculation = (bucket) => {
      const quota = get(bucket, 'quota.value');
      const deltaUsageDerivNormalizedValue = get(bucket, 'usage_deriv.normalized_value');
      const periodsDerivNormalizedValue = get(bucket, 'periods_deriv.normalized_value');

      if (deltaUsageDerivNormalizedValue && periodsDerivNormalizedValue && quota > 0) {
        // if throttling is configured
        const factor =
          deltaUsageDerivNormalizedValue / (periodsDerivNormalizedValue * quota * 1000); // convert quota from microseconds to nanoseconds by multiplying 1000
        return factor * 100; // convert factor to percentage
      }
      // if throttling is NOT configured, show nothing. The user should see that something is not configured correctly
      return null;
    };
  }
}
