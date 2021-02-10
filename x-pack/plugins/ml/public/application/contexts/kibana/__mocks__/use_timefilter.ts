/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { TimefilterContract } from '../../../../../../../../src/plugins/data/public';
import { Observable } from 'rxjs';

/**
 * Copy from {@link '../../../../../../../../src/plugins/data/public/query/timefilter/timefilter_service.mock'}
 */
const timefilterMock: jest.Mocked<TimefilterContract> = {
  isAutoRefreshSelectorEnabled: jest.fn(),
  isTimeRangeSelectorEnabled: jest.fn(),
  isTimeTouched: jest.fn(),
  getEnabledUpdated$: jest.fn(),
  getTimeUpdate$: jest.fn(),
  getRefreshIntervalUpdate$: jest.fn(),
  getAutoRefreshFetch$: jest.fn(() => new Observable<unknown>()),
  getFetch$: jest.fn(),
  getTime: jest.fn(),
  setTime: jest.fn(),
  setRefreshInterval: jest.fn(),
  getRefreshInterval: jest.fn(),
  getActiveBounds: jest.fn(),
  disableAutoRefreshSelector: jest.fn(),
  disableTimeRangeSelector: jest.fn(),
  enableAutoRefreshSelector: jest.fn(),
  enableTimeRangeSelector: jest.fn(),
  getBounds: jest.fn(),
  calculateBounds: jest.fn(),
  createFilter: jest.fn(),
  getRefreshIntervalDefaults: jest.fn(),
  getTimeDefaults: jest.fn(),
};

export const useTimefilter = jest.fn(() => {
  return timefilterMock;
});
