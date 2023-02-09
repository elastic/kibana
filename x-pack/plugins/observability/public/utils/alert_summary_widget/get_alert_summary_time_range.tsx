/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { getAbsoluteTimeRange, TimeBuckets } from '@kbn/data-plugin/common';
import { TimeRange } from '@kbn/es-query';
import { FormattedMessage } from '@kbn/i18n-react';
import type { AlertSummaryTimeRange } from '@kbn/triggers-actions-ui-plugin/public';
import { getAbsoluteTime } from '../date';
import { getBucketSize } from '../get_bucket_size';

export const getDefaultAlertSummaryTimeRange = (): AlertSummaryTimeRange => {
  const { to, from } = getAbsoluteTimeRange({
    from: 'now-30d',
    to: 'now',
  });

  return {
    utcFrom: from,
    utcTo: to,
    fixedInterval: '1d',
    title: (
      <FormattedMessage
        id="xpack.observability.alertsSummaryWidget.last30days"
        defaultMessage="Last 30 days"
      />
    ),
  };
};

export const getAlertSummaryTimeRange = (
  timeRange: TimeRange,
  timeBuckets: TimeBuckets
): AlertSummaryTimeRange => {
  const { to, from } = getAbsoluteTimeRange(timeRange);
  const fixedInterval = getFixedInterval(timeRange);
  timeBuckets.setInterval(fixedInterval);

  return {
    utcFrom: from,
    utcTo: to,
    fixedInterval,
    dateFormat: timeBuckets.getScaledDateFormat(),
  };
};

const getFixedInterval = ({ from, to }: TimeRange) => {
  const start = getAbsoluteTime(from);
  const end = getAbsoluteTime(to, { roundUp: true });

  if (start && end) {
    return getBucketSize({ start, end, minInterval: '30s', buckets: 60 }).intervalString;
  }

  return '1m';
};
