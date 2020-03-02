/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { useContext } from 'react';
import { useThrottle } from 'react-use';

import { RendererFunction } from '../../../utils/typed_react';
import { Source } from '../../source';
import { LogSummaryBuckets, useLogSummary } from './log_summary';
import { LogFilterState } from '../log_filter';
import { LogPositionState } from '../log_position';

export const WithSummary = ({
  children,
}: {
  children: RendererFunction<{
    buckets: LogSummaryBuckets;
    start: number | null;
    end: number | null;
  }>;
}) => {
  const { sourceId } = useContext(Source.Context);
  const { filterQuery } = useContext(LogFilterState.Context);
  const { startDate, endDate, startTimestamp, endTimestamp } = useContext(LogPositionState.Context);

  // Keep it reasonably updated for the `now` case, but don't reload all the time when the user scrolls
  const throttledStartTimestamp = useThrottle(startTimestamp, 3000);
  const throttledEndTimestamp = useThrottle(endTimestamp, 3000);

  const { buckets, start, end } = useLogSummary(
    sourceId,
    throttledStartTimestamp,
    throttledEndTimestamp,
    filterQuery
  );

  return children({ buckets, start, end });
};
