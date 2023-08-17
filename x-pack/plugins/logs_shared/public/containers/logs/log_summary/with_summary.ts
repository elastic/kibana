/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import useThrottle from 'react-use/lib/useThrottle';
import { useLogPositionStateContext, useLogViewContext } from '../../..';
import { RendererFunction } from '../../../utils/typed_react';
import { LogSummaryBuckets, useLogSummary } from './log_summary';

const FETCH_THROTTLE_INTERVAL = 3000;

export interface WithSummaryProps {
  serializedParsedQuery: string | null;
  children: RendererFunction<{
    buckets: LogSummaryBuckets;
    start: number | null;
    end: number | null;
  }>;
}

export const WithSummary = ({ serializedParsedQuery, children }: WithSummaryProps) => {
  const { logViewReference } = useLogViewContext();
  const { startTimestamp, endTimestamp } = useLogPositionStateContext();

  // Keep it reasonably updated for the `now` case, but don't reload all the time when the user scrolls
  const throttledStartTimestamp = useThrottle(startTimestamp, FETCH_THROTTLE_INTERVAL);
  const throttledEndTimestamp = useThrottle(endTimestamp, FETCH_THROTTLE_INTERVAL);

  const { buckets, start, end } = useLogSummary(
    logViewReference,
    throttledStartTimestamp,
    throttledEndTimestamp,
    serializedParsedQuery
  );

  return children({ buckets, start, end });
};
