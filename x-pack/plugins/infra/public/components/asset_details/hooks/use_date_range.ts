/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { TimeRange } from '@kbn/es-query';
import createContainer from 'constate';
import { useCallback, useMemo, useState } from 'react';
import { parseDateRange } from '../../../utils/datemath';

import { toTimestampRange } from '../utils';

const DEFAULT_DATE_RANGE: TimeRange = {
  from: 'now-15m',
  to: 'now',
};

export interface UseAssetDetailsStateProps {
  initialDateRange: TimeRange;
}

export function useDateRangeProvider({ initialDateRange }: UseAssetDetailsStateProps) {
  const [dateRange, setDateRange] = useState(initialDateRange);

  const parsedDateRange = useMemo(() => {
    const { from = DEFAULT_DATE_RANGE.from, to = DEFAULT_DATE_RANGE.to } =
      parseDateRange(dateRange);

    return { from, to };
  }, [dateRange]);

  const getDateRangeInTimestamp = useCallback(
    () => toTimestampRange(parsedDateRange),
    [parsedDateRange]
  );

  return { dateRange, setDateRange, getDateRangeInTimestamp };
}

export const [DateRangeProvider, useDateRangeProviderContext] =
  createContainer(useDateRangeProvider);
