/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { useObservable } from 'react-use';
import { merge } from 'rxjs';
import { map, skip } from 'rxjs/operators';

import { useMemo } from 'react';
import { annotationsRefresh$ } from '../services/annotations_service';
import { mlTimefilterRefresh$ } from '../services/timefilter_refresh_service';
import { useTimefilter } from '../contexts/kibana';

export interface Refresh {
  lastRefresh: number;
  timeRange?: { start: string; end: string };
}

/**
 * Hook that provides the latest refresh timestamp
 * and the most recent applied time range.
 */
export const useRefresh = () => {
  const timefilter = useTimefilter();

  const refresh$ = useMemo(() => {
    return merge(
      mlTimefilterRefresh$,
      timefilter.getTimeUpdate$().pipe(
        // skip initially emitted value
        skip(1),
        map((_) => {
          const { from, to } = timefilter.getTime();
          return { lastRefresh: Date.now(), timeRange: { start: from, end: to } };
        })
      ),
      annotationsRefresh$.pipe(map((d) => ({ lastRefresh: d })))
    );
  }, []);

  return useObservable<Refresh>(refresh$);
};
