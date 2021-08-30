/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useRef } from 'react';
import { useTimeRangeId } from '../context/time_range_id/use_time_range_id';
import { getDateRange } from '../context/url_params_context/helpers';

interface TimeRange {
  start: string;
  end: string;
  exactStart: string;
  exactEnd: string;
  refreshTimeRange: () => void;
  timeRangeId: number;
}

type PartialTimeRange = Pick<TimeRange, 'refreshTimeRange' | 'timeRangeId'> &
  Pick<Partial<TimeRange>, 'start' | 'end' | 'exactStart' | 'exactEnd'>;

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
  const rangeRef = useRef({ rangeFrom, rangeTo });

  const { timeRangeId, incrementTimeRangeId } = useTimeRangeId();

  const timeRangeIdRef = useRef(timeRangeId);

  const stateRef = useRef(getDateRange({ state: {}, rangeFrom, rangeTo }));

  const updateParsedTime = () => {
    stateRef.current = getDateRange({ state: {}, rangeFrom, rangeTo });
  };

  if (
    timeRangeIdRef.current !== timeRangeId ||
    rangeRef.current.rangeFrom !== rangeFrom ||
    rangeRef.current.rangeTo !== rangeTo
  ) {
    updateParsedTime();
  }

  rangeRef.current = { rangeFrom, rangeTo };

  const { start, end, exactStart, exactEnd } = stateRef.current;

  if ((!start || !end || !exactStart || !exactEnd) && !optional) {
    throw new Error('start and/or end were unexpectedly not set');
  }

  return {
    start,
    end,
    exactStart,
    exactEnd,
    refreshTimeRange: incrementTimeRangeId,
    timeRangeId,
  };
}
