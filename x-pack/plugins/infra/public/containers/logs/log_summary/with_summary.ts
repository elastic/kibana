/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useContext } from 'react';
import useThrottle from 'react-use/lib/useThrottle';
import { useLogViewContext } from '../../../hooks/use_log_view';
import { RendererFunction } from '../../../utils/typed_react';
import { LogFilterState } from '../log_filter';
import { LogPositionState } from '../log_position';
import { LogSummaryBuckets, useLogSummary } from './log_summary';

const FETCH_THROTTLE_INTERVAL = 3000;

export const WithSummary = ({
  children,
}: {
  children: RendererFunction<{
    buckets: LogSummaryBuckets;
    start: number | null;
    end: number | null;
  }>;
}) => {
  const { logViewId } = useLogViewContext();
  const { filterQuery } = useContext(LogFilterState.Context);
  const { startTimestamp, endTimestamp } = useContext(LogPositionState.Context);

  // Keep it reasonably updated for the `now` case, but don't reload all the time when the user scrolls
  const throttledStartTimestamp = useThrottle(startTimestamp, FETCH_THROTTLE_INTERVAL);
  const throttledEndTimestamp = useThrottle(endTimestamp, FETCH_THROTTLE_INTERVAL);

  const { buckets, start, end } = useLogSummary(
    logViewId,
    throttledStartTimestamp,
    throttledEndTimestamp,
    filterQuery?.serializedQuery ?? null
  );

  return children({ buckets, start, end });
};
