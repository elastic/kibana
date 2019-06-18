/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Subject } from 'rxjs';
import { timefilter as timefilterDep } from 'ui/timefilter';
import { Timefilter, RefreshInterval } from 'src/legacy/ui/public/timefilter/timefilter';

export type Action = string;

export const TIMEFILTER = {
  SET_TIME: 'set_time',
  SET_REFRESH_INTERVAL: 'set_refresh_interval',
};

export const timefilter$ = new Subject();

class MlTimefilter {
  disableAutoRefreshSelector() {
    return timefilterDep.disableAutoRefreshSelector();
  }

  disableTimeRangeSelector() {
    return timefilterDep.disableTimeRangeSelector();
  }

  enableAutoRefreshSelector() {
    return timefilterDep.enableAutoRefreshSelector();
  }

  enableTimeRangeSelector() {
    return timefilterDep.enableTimeRangeSelector();
  }

  getActiveBounds() {
    return timefilterDep.getActiveBounds();
  }

  getRefreshInterval() {
    return timefilterDep.getRefreshInterval();
  }

  getTime() {
    return timefilterDep.getTime();
  }

  off() {}

  on() {}
  // in timefilter dependency - 'fetch' is emitted
  setRefreshInterval(interval: RefreshInterval) {
    timefilterDep.setRefreshInterval(interval);
  }
  // in timefilter dependency - 'fetch' is emitted
  setTime(time: Timefilter['time']) {
    timefilterDep.setTime(time);
    timefilter$.next({ action: TIMEFILTER.SET_TIME, payload: time });
  }
}

export const timefilter = new MlTimefilter();
