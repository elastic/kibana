/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEffect, useState } from 'react';
import { combineLatest, Observable } from 'rxjs';
import { startWith } from 'rxjs/operators';
import { TimefilterContract } from '@kbn/data-plugin/public';
import { SingleMetricViewerEmbeddableInput } from '..';
import type { TimeRangeBounds } from '../../application/util/time_buckets';

export function useSingleMetricViwerInputResolver(
  embeddableInput: Observable<SingleMetricViewerEmbeddableInput>,
  refresh: Observable<any>,
  timefilter: TimefilterContract
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
            const currentBounds = timefilter.getBounds();
            setBounds(currentBounds);
            setLastRefresh(Date.now());
          }
        }
      }
    );

    return () => subscription.unsubscribe();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return { data, bounds, lastRefresh };
}
