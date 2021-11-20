/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { throttle } from 'lodash/fp';
import { useMemo, useState } from 'react';
import useResizeObserver from 'use-resize-observer/polyfilled';
import { niceTimeFormatByDay, timeFormatter } from '@elastic/charts';
import moment from 'moment-timezone';

export const getDaysDiff = (minDate: moment.Moment, maxDate: moment.Moment) => {
  const diff = maxDate.diff(minDate, 'days');

  if (diff <= 1 && !minDate.isSame(maxDate)) {
    return 2; // to return proper pattern from niceTimeFormatByDay
  }

  return diff;
};

export const histogramDateTimeFormatter = (domain: [string, string] | null, fixedDiff?: number) => {
  // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
  const diff = fixedDiff ?? getDaysDiff(moment(domain![0]), moment(domain![1]));
  const format = niceTimeFormatByDay(diff);
  return timeFormatter(format);
};

export const useThrottledResizeObserver = (wait = 100) => {
  const [size, setSize] = useState<{ width: number; height: number }>({ width: 0, height: 0 });
  const onResize = useMemo(() => throttle(wait, setSize), [wait]);
  const { ref } = useResizeObserver<HTMLDivElement>({ onResize });

  return { ref, ...size };
};
