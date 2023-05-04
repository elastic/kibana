/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook } from '@testing-library/react-hooks';
import {
  mockGlobalState,
  SUB_PLUGINS_REDUCER,
  TestProviders,
  kibanaObservable,
  createSecuritySolutionStorageMock,
} from '../../common/mock';
import { useTimelineDataFilters } from './use_timeline_data_filters';
import { createStore } from '../../common/store';
import React from 'react';
import { SourcererScopeName } from '../../common/store/sourcerer/model';

jest.mock('react-router-dom', () => {
  const actual = jest.requireActual('react-router-dom');
  return { ...actual, useLocation: jest.fn().mockReturnValue({ pathname }) };
});

const defaultDataViewPattern = 'test-dataview-patterns';
const timelinePattern = 'test-timeline-patterns';
const alertsPagePatterns = '.siem-signals-spacename';
const pathname = '/alerts';
const { storage } = createSecuritySolutionStorageMock();
const store = createStore(
  {
    ...mockGlobalState,
    sourcerer: {
      ...mockGlobalState.sourcerer,
      defaultDataView: {
        ...mockGlobalState.sourcerer.defaultDataView,
        patternList: [defaultDataViewPattern],
      },
      sourcererScopes: {
        ...mockGlobalState.sourcerer.sourcererScopes,
        [SourcererScopeName.timeline]: {
          ...mockGlobalState.sourcerer.sourcererScopes[SourcererScopeName.timeline],
          selectedPatterns: [timelinePattern],
        },
      },
    },
  },
  SUB_PLUGINS_REDUCER,
  kibanaObservable,
  storage
);

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <TestProviders store={store}>{children}</TestProviders>
);

describe('useTimelineDataFilters', () => {
  describe('on alerts page', () => {
    it('returns default data view patterns and alerts page patterns when isActiveTimelines is falsy', () => {
      const isActiveTimelines = false;
      const { result } = renderHook(() => useTimelineDataFilters(isActiveTimelines), { wrapper });

      expect(result.current.selectedPatterns).toEqual([alertsPagePatterns, defaultDataViewPattern]);
    });

    it('returns default data view patterns and timelinePatterns when isActiveTimelines is truthy', () => {
      const isActiveTimelines = true;
      const { result } = renderHook(() => useTimelineDataFilters(isActiveTimelines), { wrapper });

      expect(result.current.selectedPatterns).toEqual([timelinePattern, defaultDataViewPattern]);
    });
  });
});
