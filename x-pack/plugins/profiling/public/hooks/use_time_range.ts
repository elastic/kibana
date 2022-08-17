/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useContext, useMemo } from 'react';
import { TimeRange } from '../../common/types';
import { getNextTimeRange } from '../utils/get_next_time_range';
import { TimeRangeContext } from '../components/contexts/time_range_context';

interface TimeRangeAPI {
  timeRangeId: string;
  refresh: () => void;
}

type PartialTimeRange = Pick<Partial<TimeRange>, 'start' | 'end'>;

export function useTimeRange(range: {
  rangeFrom?: string;
  rangeTo?: string;
  optional: true;
}): TimeRangeAPI & PartialTimeRange;

export function useTimeRange(range: {
  rangeFrom: string;
  rangeTo: string;
}): TimeRangeAPI & TimeRange;

export function useTimeRange({
  rangeFrom,
  rangeTo,
  optional,
}: {
  rangeFrom?: string;
  rangeTo?: string;
  optional?: boolean;
}): TimeRangeAPI & (TimeRange | PartialTimeRange) {
  const timeRangeApi = useContext(TimeRangeContext);

  if (!timeRangeApi) {
    throw new Error('TimeRangeContext has not been provided');
  }

  const { start, end } = useMemo(() => {
    return getNextTimeRange({
      state: {},
      rangeFrom,
      rangeTo,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rangeFrom, rangeTo, timeRangeApi.timeRangeId]);

  if ((!start || !end) && !optional) {
    throw new Error('start and/or end were unexpectedly not set');
  }

  return {
    start,
    end,
    ...timeRangeApi,
  };
}
