/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Comparator, InventoryMetricConditions } from '../../../../../common/alerting/metrics';
import { SnapshotCustomMetricInput } from '../../../../../common/http_api';
import { SnapshotMetricType } from '../../../../../common/inventory_models/types';
import { createConditionScript } from './create_condition_script';

const EMPTY_SHOULD_WARN = {
  bucket_script: {
    buckets_path: {},
    script: '0',
  },
};

export const createBucketSelector = (
  metric: SnapshotMetricType,
  condition: InventoryMetricConditions,
  customMetric?: SnapshotCustomMetricInput
) => {
  const metricId = customMetric && customMetric.field ? customMetric.id : metric;
  const hasWarn = condition.warningThreshold != null && condition.warningComparator != null;
  const hasTrigger = condition.threshold != null && condition.comparator != null;

  const shouldWarn = hasWarn
    ? {
        bucket_script: {
          buckets_path: {
            value: metricId,
          },
          script: createConditionScript(
            condition.warningThreshold as number[],
            condition.warningComparator as Comparator,
            metric
          ),
        },
      }
    : EMPTY_SHOULD_WARN;

  const shouldTrigger = hasTrigger
    ? {
        bucket_script: {
          buckets_path: {
            value: metricId,
          },
          script: createConditionScript(condition.threshold, condition.comparator, metric),
        },
      }
    : EMPTY_SHOULD_WARN;

  return {
    selectedBucket: {
      bucket_selector: {
        buckets_path: {
          shouldWarn: 'shouldWarn',
          shouldTrigger: 'shouldTrigger',
        },
        script:
          '(params.shouldWarn != null && params.shouldWarn > 0) || (params.shouldTrigger != null && params.shouldTrigger > 0)',
      },
    },
    shouldWarn,
    shouldTrigger,
  };
};
