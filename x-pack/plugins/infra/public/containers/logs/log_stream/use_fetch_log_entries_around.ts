/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { combineLatest } from 'rxjs';
import { map, switchMap } from 'rxjs/operators';
import { LogSourceColumnConfiguration } from '../../../../common/http_api/log_sources';
import { JsonObject } from '../../../../common/typed_json';
import { useObservable, useSubscription } from '../../../utils/use_observable';
import { useFetchLogEntriesAfter } from './use_fetch_log_entries_after';
import { useFetchLogEntriesBefore } from './use_fetch_log_entries_before';

export const useFetchLogEntriesAround = ({
  columnOverrides,
  endTimestamp,
  highlightPhrase,
  query,
  sourceId,
  startTimestamp,
}: {
  columnOverrides?: LogSourceColumnConfiguration[];
  endTimestamp: number;
  highlightPhrase?: string;
  query?: JsonObject;
  sourceId: string;
  startTimestamp: number;
}) => {
  const {
    fetchLogEntriesBefore,
    isRequestRunning: isLogEntriesBeforeRequestRunning,
    isResponsePartial: isLogEntriesBeforeResponsePartial,
    logEntriesBeforeSearchResponse$,
  } = useFetchLogEntriesBefore({
    columnOverrides,
    endTimestamp,
    highlightPhrase,
    query,
    sourceId,
    startTimestamp,
  });

  const {
    fetchLogEntriesAfter,
    isRequestRunning: isLogEntriesAfterRequestRunning,
    isResponsePartial: isLogEntriesAfterResponsePartial,
    logEntriesAfterSearchResponse$,
  } = useFetchLogEntriesAfter({
    columnOverrides,
    endTimestamp,
    highlightPhrase,
    query,
    sourceId,
    startTimestamp,
  });

  // TODO: make result flattening and transformation more composable

  const combinedLogEntriesSearchResponse$ = useObservable(
    (inputs$) =>
      inputs$.pipe(
        switchMap(([beforeResponse$, afterResponse$]) =>
          combineLatest([beforeResponse$, afterResponse$])
        ),
        map(([a, b]) => [a, b] as const)
      ),
    [logEntriesBeforeSearchResponse$, logEntriesAfterSearchResponse$] as const
  );

  useSubscription(combinedLogEntriesSearchResponse$, {
    next: ([a, b]) => {
      console.log('combined next', a, b);
    },
  });

  // return {
  //   cancelRequest,
  //   fetchLogEntriesAround,
  //   isRequestRunning,
  //   isResponsePartial,
  //   loaded,
  //   total,
  // };
};
