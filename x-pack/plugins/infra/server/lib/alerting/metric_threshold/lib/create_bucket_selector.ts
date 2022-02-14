/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  Aggregators,
  Comparator,
  MetricExpressionParams,
} from '../../../../../common/alerting/metrics';
import { createConditionScript } from './create_condition_script';

const EMPTY_SHOULD_WARN = {
  bucket_script: {
    buckets_path: {},
    script: '0',
  },
};

export const createBucketSelector = (
  condition: MetricExpressionParams,
  alertOnGroupDisappear: boolean = false
) => {
  const hasWarn = condition.warningThreshold != null && condition.warningComparator != null;
  const isPercentile = [Aggregators.P95, Aggregators.P99].includes(condition.aggType);
  const bucketPath = isPercentile
    ? `aggregatedValue[${condition.aggType === Aggregators.P95 ? '95' : '99'}]`
    : 'aggregatedValue';

  const shouldWarn = hasWarn
    ? {
        bucket_script: {
          buckets_path: {
            value: bucketPath,
          },
          script: createConditionScript(
            condition.warningThreshold as number[],
            condition.warningComparator as Comparator
          ),
        },
      }
    : EMPTY_SHOULD_WARN;

  const shouldTrigger = {
    bucket_script: {
      buckets_path: {
        value: bucketPath,
      },
      script: createConditionScript(condition.threshold, condition.comparator),
    },
  };

  const aggs: any = {
    shouldWarn,
    shouldTrigger,
  };

  if (!alertOnGroupDisappear) {
    aggs.selectedBucket = {
      bucket_selector: {
        buckets_path: {
          shouldWarn: 'shouldWarn',
          shouldTrigger: 'shouldTrigger',
        },
        script: 'params.shouldWarn > 0 || params.shouldTrigger > 0',
      },
    };
  }
  return aggs;
};
