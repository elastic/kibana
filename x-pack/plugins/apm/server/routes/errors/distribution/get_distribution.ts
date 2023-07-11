/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { offsetPreviousPeriodCoordinates } from '../../../../common/utils/offset_previous_period_coordinate';
import { BUCKET_TARGET_COUNT } from '../../transactions/constants';
import { getBuckets } from './get_buckets';
import { getOffsetInMs } from '../../../../common/utils/get_offset_in_ms';
import { APMEventClient } from '../../../lib/helpers/create_es_client/create_apm_event_client';
import { Maybe } from '../../../../typings/common';

function getBucketSize({ start, end }: { start: number; end: number }) {
  return Math.floor((end - start) / BUCKET_TARGET_COUNT);
}

export interface ErrorDistributionResponse {
  currentPeriod: Array<{ x: number; y: number }>;
  previousPeriod: Array<{
    x: number;
    y: Maybe<number>;
  }>;
  bucketSize: number;
}

export async function getErrorDistribution({
  environment,
  kuery,
  serviceName,
  groupId,
  apmEventClient,
  start,
  end,
  offset,
}: {
  environment: string;
  kuery: string;
  serviceName: string;
  groupId?: string;
  apmEventClient: APMEventClient;
  start: number;
  end: number;
  offset?: string;
}): Promise<ErrorDistributionResponse> {
  const { startWithOffset, endWithOffset } = getOffsetInMs({
    start,
    end,
    offset,
  });

  const bucketSize = getBucketSize({
    start: startWithOffset,
    end: endWithOffset,
  });

  const commonProps = {
    environment,
    kuery,
    serviceName,
    groupId,
    apmEventClient,
    bucketSize,
  };
  const currentPeriodPromise = getBuckets({
    ...commonProps,
    start,
    end,
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
