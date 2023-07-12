/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo } from 'react';
import {
  calculateTimeRangeBucketSize,
  getAlertSummaryTimeRange,
  useTimeBuckets,
} from '@kbn/observability-plugin/public';
import type { TimeRange } from '@kbn/es-query';
import {
  DEFAULT_DATE_FORMAT,
  DEFAULT_INTERVAL,
} from '../../pages/metrics/hosts/components/tabs/config';

export const useSummaryTimeRange = (unifiedSearchDateRange: TimeRange) => {
  const timeBuckets = useTimeBuckets();

  const bucketSize = useMemo(
    () => calculateTimeRangeBucketSize(unifiedSearchDateRange, timeBuckets),
    [unifiedSearchDateRange, timeBuckets]
  );

  return getAlertSummaryTimeRange(
    unifiedSearchDateRange,
    bucketSize?.intervalString || DEFAULT_INTERVAL,
    bucketSize?.dateFormat || DEFAULT_DATE_FORMAT
  );
};
