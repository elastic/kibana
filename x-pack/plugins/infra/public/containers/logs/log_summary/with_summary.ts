/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { useContext } from 'react';
import useThrottle from 'react-use/lib/useThrottle';

import { RendererFunction } from '../../../utils/typed_react';
import { LogSummaryBuckets, useLogSummary } from './log_summary';
import { LogFilterState } from '../log_filter';
import { LogPositionState } from '../log_position';
import { useLogSourceContext } from '../log_source';

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
  const { sourceId } = useLogSourceContext();
  const { filterQuery } = useContext(LogFilterState.Context);
  const { startTimestamp, endTimestamp } = useContext(LogPositionState.Context);

  // Keep it reasonably updated for the `now` case, but don't reload all the time when the user scrolls
  const throttledStartTimestamp = useThrottle(startTimestamp, FETCH_THROTTLE_INTERVAL);
  const throttledEndTimestamp = useThrottle(endTimestamp, FETCH_THROTTLE_INTERVAL);

  const { buckets, start, end } = useLogSummary(
    sourceId,
    throttledStartTimestamp,
    throttledEndTimestamp,
    filterQuery
  );

  return children({ buckets, start, end });
};
