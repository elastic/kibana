/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo } from 'react';
import { TimeRange } from '../../common/types';
import { getNextTimeRange } from '../utils/get_next_time_range';

type PartialTimeRange = Pick<Partial<TimeRange>, 'start' | 'end'>;

export function useTimeRange(range: {
  rangeFrom?: string;
  rangeTo?: string;
  optional: true;
}): PartialTimeRange;

export function useTimeRange(range: { rangeFrom: string; rangeTo: string }): TimeRange;

export function useTimeRange({
  rangeFrom,
  rangeTo,
  optional,
}: {
  rangeFrom?: string;
  rangeTo?: string;
  optional?: boolean;
}): TimeRange | PartialTimeRange {
  const { start, end } = useMemo(() => {
    return getNextTimeRange({
      state: {},
      rangeFrom,
      rangeTo,
    });
  }, [rangeFrom, rangeTo]);

  if ((!start || !end) && !optional) {
    throw new Error('start and/or end were unexpectedly not set');
  }

  return {
    start,
    end,
  };
}
