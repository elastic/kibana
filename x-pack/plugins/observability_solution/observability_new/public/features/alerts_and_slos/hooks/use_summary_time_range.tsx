/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo } from 'react';
import type { TimeRange } from '@kbn/es-query';
import { useUiSetting } from '@kbn/kibana-react-plugin/public';
import { DEFAULT_INTERVAL, DEFAULT_DATE_FORMAT } from '../constants';
import { useTimeBuckets } from './use_time_buckets';
import { calculateTimeRangeBucketSize } from '../pages/overview/helpers/calculate_bucket_size';
import { getAlertSummaryTimeRange } from '../utils/alert_summary_widget';

export const useSummaryTimeRange = (unifiedSearchDateRange: TimeRange) => {
  const timeBuckets = useTimeBuckets();
  const dateFormat = useUiSetting<string>('dateFormat');

  const bucketSize = useMemo(
    () => calculateTimeRangeBucketSize(unifiedSearchDateRange, timeBuckets),
    [unifiedSearchDateRange, timeBuckets]
  );

  return getAlertSummaryTimeRange(
    unifiedSearchDateRange,
    bucketSize?.intervalString ?? DEFAULT_INTERVAL,
    bucketSize?.dateFormat ?? dateFormat ?? DEFAULT_DATE_FORMAT
  );
};
