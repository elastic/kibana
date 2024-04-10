/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEffect, useState } from 'react';
import type { Observable } from 'rxjs';
import { combineLatest } from 'rxjs';
import { startWith } from 'rxjs';
import type { TimefilterContract } from '@kbn/data-plugin/public';
import type { TimeRangeBounds } from '@kbn/ml-time-buckets';
import type { SingleMetricViewerEmbeddableInput } from '..';

export function useSingleMetricViewerInputResolver(
  embeddableInput: Observable<SingleMetricViewerEmbeddableInput>,
  refresh: Observable<void>,
  timefilter: TimefilterContract,
  onRenderComplete: () => void
) {
  const [data, setData] = useState<any>();
  const [bounds, setBounds] = useState<TimeRangeBounds | undefined>();
  const [lastRefresh, setLastRefresh] = useState<number | undefined>();

  useEffect(function subscribeToEmbeddableInput() {
    const subscription = combineLatest([embeddableInput, refresh.pipe(startWith(null))]).subscribe(
      (input) => {
        if (input !== undefined) {
          setData(input[0]);
          if (timefilter !== undefined) {
            const { timeRange } = input[0];
            const currentBounds = timefilter.calculateBounds(timeRange);
            setBounds(currentBounds);
            setLastRefresh(Date.now());
          }
          onRenderComplete();
        }
      }
    );

    return () => subscription.unsubscribe();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return { data, bounds, lastRefresh };
}
