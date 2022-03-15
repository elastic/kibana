/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { offsetPreviousPeriodCoordinates } from '../../../../common/utils/offset_previous_period_coordinate';
import { Setup } from '../../../lib/helpers/setup_request';
import { BUCKET_TARGET_COUNT } from '../../transactions/constants';
import { getBuckets } from './get_buckets';
import { getOffsetInMs } from '../../../../common/utils/get_offset_in_ms';

function getBucketSize({ start, end }: { start: number; end: number }) {
  return Math.floor((end - start) / BUCKET_TARGET_COUNT);
}

export async function getErrorDistribution({
  environment,
  kuery,
  serviceName,
  groupId,
  setup,
  start,
  end,
  offset,
}: {
  environment: string;
  kuery: string;
  serviceName: string;
  groupId?: string;
  setup: Setup;
  start: number;
  end: number;
  offset?: string;
}) {
  const bucketSize = getBucketSize({ start, end });
  const commonProps = {
    environment,
    kuery,
    serviceName,
    groupId,
    setup,
    bucketSize,
  };
  const currentPeriodPromise = getBuckets({
    ...commonProps,
    start,
    end,
  });

  const { startWithOffset, endWithOffset } = getOffsetInMs({
    start,
    end,
    offset,
  });

  const previousPeriodPromise = offset
    ? getBuckets({
        ...commonProps,
        start: startWithOffset,
        end: endWithOffset,
      })
    : { buckets: [], bucketSize: null };

  const [currentPeriod, previousPeriod] = await Promise.all([
    currentPeriodPromise,
    previousPeriodPromise,
  ]);

  return {
    currentPeriod: currentPeriod.buckets,
    previousPeriod: offsetPreviousPeriodCoordinates({
      currentPeriodTimeseries: currentPeriod.buckets,
      previousPeriodTimeseries: previousPeriod.buckets,
    }),
    bucketSize,
  };
}
