/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo } from 'react';
import { useTimeRangeId } from '../context/time_range_id/use_time_range_id';
import { getDateRange } from '../context/url_params_context/helpers';

interface TimeRange {
  start: string;
  end: string;
  refreshTimeRange: () => void;
  timeRangeId: number;
}

type PartialTimeRange = Pick<TimeRange, 'refreshTimeRange' | 'timeRangeId'> &
  Pick<Partial<TimeRange>, 'start' | 'end'>;

export function useTimeRange(range: {
  rangeFrom?: string;
  rangeTo?: string;
  optional: true;
}): PartialTimeRange;

export function useTimeRange(range: {
  rangeFrom: string;
  rangeTo: string;
}): TimeRange;

export function useTimeRange({
  rangeFrom,
  rangeTo,
  optional,
}: {
  rangeFrom?: string;
  rangeTo?: string;
  optional?: boolean;
}): TimeRange | PartialTimeRange {
  const { incrementTimeRangeId, timeRangeId } = useTimeRangeId();

  const { start, end } = useMemo(() => {
    return getDateRange({
      state: {},
      rangeFrom,
      rangeTo,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rangeFrom, rangeTo, timeRangeId]);

  if ((!start || !end) && !optional) {
    throw new Error('start and/or end were unexpectedly not set');
  }

  return {
    start,
    end,
    refreshTimeRange: incrementTimeRangeId,
    timeRangeId,
  };
}
