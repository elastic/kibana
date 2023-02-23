/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { RefreshInterval, TimefilterContract } from '@kbn/data-plugin/public';
import { TimeRange } from '@kbn/es-query';
import { IStateStorage } from '@kbn/kibana-utils-plugin/public';
import { map, merge, Observable, of } from 'rxjs';

export const timefilterStateStorageKey = 'timefilter';
type TimefilterStateStorageKey = typeof timefilterStateStorageKey;

interface ITimefilterStateStorage extends IStateStorage {
  set<State>(key: TimefilterStateStorageKey, state: TimefilterState): void;
  set<State>(key: string, state: State): void;
  get<State = unknown>(key: TimefilterStateStorageKey): TimefilterState | null;
  get<State = unknown>(key: string): State | null;
  change$<State = unknown>(key: TimefilterStateStorageKey): Observable<TimefilterState | null>;
  change$<State = unknown>(key: string): Observable<State | null>;
}

export interface TimefilterState {
  timeRange?: TimeRange;
  refreshInterval?: RefreshInterval;
}

export const createTimefilterStateStorage = ({
  timefilter,
}: {
  timefilter: TimefilterContract;
}): ITimefilterStateStorage => {
  return {
    set: (key, state) => {
      if (key !== timefilterStateStorageKey) {
        return;
      }

      // TS doesn't narrow the overload arguments correctly
      const { timeRange, refreshInterval } = state as TimefilterState;

      if (timeRange != null) {
        timefilter.setTime(timeRange);
      }
      if (refreshInterval != null) {
        timefilter.setRefreshInterval(refreshInterval);
      }
    },
    get: (key) => (key === timefilterStateStorageKey ? getTimefilterState(timefilter) : null),
    change$: (key) =>
      key === timefilterStateStorageKey
        ? merge(timefilter.getTimeUpdate$(), timefilter.getRefreshIntervalUpdate$()).pipe(
            map(() => getTimefilterState(timefilter))
          )
        : of(null),
  };
};

const getTimefilterState = (timefilter: TimefilterContract): TimefilterState => ({
  timeRange: timefilter.getTime(),
  refreshInterval: timefilter.getRefreshInterval(),
});
