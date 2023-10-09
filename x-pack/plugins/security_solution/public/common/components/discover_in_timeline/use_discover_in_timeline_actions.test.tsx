/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { createSearchSourceMock } from '@kbn/data-plugin/public/mocks';
import { discoverPluginMock } from '@kbn/discover-plugin/public/mocks';
import { dataViewMock } from '@kbn/discover-utils/src/__mocks__';
import type { SavedSearch } from '@kbn/saved-search-plugin/common';
import { renderHook } from '@testing-library/react-hooks';
import {
  createSecuritySolutionStorageMock,
  kibanaObservable,
  mockGlobalState,
  SUB_PLUGINS_REDUCER,
  TestProviders,
} from '../../mock';
import { useDiscoverInTimelineActions } from './use_discover_in_timeline_actions';
import type { Filter } from '@kbn/es-query';
import { createStartServicesMock } from '../../lib/kibana/kibana_react.mock';
import { useKibana } from '../../lib/kibana';
import type { State } from '../../store';
import { createStore } from '../../store';
import { TimelineId } from '../../../../common/types';
import type { ComponentType, FC, PropsWithChildren } from 'react';
import React from 'react';
import type { DataView } from '@kbn/data-views-plugin/common';
import TestRenderer from 'react-test-renderer';

const { act } = TestRenderer;

let mockDiscoverStateContainerRef = {
  current: discoverPluginMock.getDiscoverStateMock({}),
};

jest.mock('../../lib/kibana');
const mockState: State = {
  ...mockGlobalState,
  timeline: {
    ...mockGlobalState.timeline,
    timelineById: {
      ...mockGlobalState.timeline.timelineById,
      [TimelineId.active]: {
        ...mockGlobalState.timeline.timelineById[TimelineId.active],
        title: 'Active Timeline',
        description: 'Active Timeline Description',
      },
    },
  },
};

jest.mock('./use_discover_in_timeline_actions', () => {
  const actual = jest.requireActual('./use_discover_in_timeline_actions');
  return actual;
});

const { storage } = createSecuritySolutionStorageMock();

const getTestProviderWithCustomState = (state: State = mockState) => {
  const store = createStore(state, SUB_PLUGINS_REDUCER, kibanaObservable, storage);

  const MockTestProvider: FC<PropsWithChildren<{}>> = ({ children }) => (
    <TestProviders store={store}> {children}</TestProviders>
  );

  return MockTestProvider;
};

const renderTestHook = (customWrapper: ComponentType = getTestProviderWithCustomState()) => {
  mockDiscoverStateContainerRef = {
    current: discoverPluginMock.getDiscoverStateMock({}),
  };
  return renderHook(() => useDiscoverInTimelineActions(mockDiscoverStateContainerRef), {
    wrapper: customWrapper,
  });
};

const customQuery = {
  language: 'kuery',
  query: '_id: *',
};

const customFilter = {
  $state: {
    store: 'appState',
  },
  meta: {
    alias: null,
    disabled: false,
    field: 'ecs.version',
    index: 'kibana-event-log-data-view',
    key: 'ecs.version',
    negate: false,
    params: {
      query: '1.8.0',
    },
    type: 'phrase',
  },
  query: {
    match_phrase: {
      'ecs.version': '1.8.0',
    },
  },
} as Filter;

const originalSavedSearchMock = {
  id: 'the-saved-search-id',
  title: 'A saved search',
  breakdownField: 'customBreakDownField',
  searchSource: createSearchSourceMock({
    index: dataViewMock,
    filter: [customFilter],
    query: customQuery,
  }),
};

export const savedSearchMock = {
  ...originalSavedSearchMock,
  hideChart: true,
  sort: ['@timestamp', 'desc'],
  timeRange: {
    from: 'now-20d',
    to: 'now',
  },
} as unknown as SavedSearch;

const startServicesMock = createStartServicesMock();

startServicesMock.dataViews.get = jest.fn(
  async () =>
    ({
      getIndexPattern: jest.fn(),
    } as unknown as DataView)
);

describe('useDiscoverInTimelineActions', () => {
  beforeEach(() => {
    (useKibana as jest.Mock).mockImplementation(() => ({
      services: startServicesMock,
    }));
  });
  afterEach(() => {
    jest.clearAllMocks();
  });
  describe('getAppStateFromSavedSearch', () => {
    it('should reach out to discover to convert app state from saved search', async () => {
      const { result, waitFor } = renderTestHook();
      const { appState } = result.current.getAppStateFromSavedSearch(savedSearchMock);
      await waitFor(() => {
        expect(appState).toMatchObject(
          expect.objectContaining({
            breakdownField: 'customBreakDownField',
            columns: ['default_column'],
            filters: [customFilter],
            grid: undefined,
            hideAggregatedPreview: undefined,
            hideChart: true,
            index: 'the-data-view-id',
            interval: 'auto',
            query: customQuery,
            rowHeight: undefined,
            rowsPerPage: undefined,
            savedQuery: undefined,
            sort: [['@timestamp', 'desc']],
            viewMode: undefined,
          })
        );
      });
    });
  });

  describe('restoreDiscoverAppStateFromSavedSearch', () => {
    it('should restore basic discover app state and timeRange from a given saved Search', async () => {
      const { result, waitFor } = renderTestHook();
      result.current.restoreDiscoverAppStateFromSavedSearch(savedSearchMock);

      await waitFor(() => {
        const appState = mockDiscoverStateContainerRef.current.appState.getState();
        const globalState = mockDiscoverStateContainerRef.current.globalState.get();
        expect(appState).toMatchObject({
          breakdownField: 'customBreakDownField',
          columns: ['default_column'],
          filters: [customFilter],
          grid: undefined,
          hideAggregatedPreview: undefined,
          hideChart: true,
          index: 'the-data-view-id',
          interval: 'auto',
          query: customQuery,
          rowHeight: undefined,
          rowsPerPage: undefined,
          savedQuery: undefined,
          sort: [['@timestamp', 'desc']],
          viewMode: undefined,
        });

        expect(globalState).toMatchObject({ time: { from: 'now-20d', to: 'now' } });
      });
    });
  });
  describe('resetDiscoverAppState', () => {
    it('should reset Discover AppState to a default state', async () => {
      const { result, waitFor } = renderTestHook();
      await result.current.resetDiscoverAppState();
      await waitFor(() => {
        const appState = mockDiscoverStateContainerRef.current.appState.getState();
        expect(appState).toMatchObject(result.current.getDefaultDiscoverAppState());
      });
    });
    it('should reset Discover time to a default state', async () => {
      const { result, waitFor } = renderTestHook();
      await result.current.resetDiscoverAppState();
      await waitFor(() => {
        const globalState = mockDiscoverStateContainerRef.current.globalState.get();
        expect(globalState).toMatchObject({ time: { from: 'now-15m', to: 'now' } });
      });
    });
  });
  describe('updateSavedSearch', () => {
    it('should add defaults to the savedSearch before updating saved search', async () => {
      const { result } = renderTestHook();
      await act(async () => {
        await result.current.updateSavedSearch(savedSearchMock, TimelineId.active);
      });

      expect(startServicesMock.savedSearch.save).toHaveBeenNthCalledWith(
        1,
        expect.objectContaining({
          timeRestore: true,
          timeRange: {
            from: 'now-20d',
            to: 'now',
          },
          tags: ['security-solution-default'],
        }),
        expect.objectContaining({
          copyOnSave: true,
        })
      );
    });
    it('should send update request when savedSearchId is already available', async () => {
      const localMockState: State = {
        ...mockGlobalState,
        timeline: {
          ...mockGlobalState.timeline,
          timelineById: {
            ...mockGlobalState.timeline.timelineById,
            [TimelineId.active]: {
              ...mockGlobalState.timeline.timelineById[TimelineId.active],
              title: 'Active Timeline',
              description: 'Active Timeline Description',
              savedSearchId: 'saved_search_id',
            },
          },
        },
      };

      const LocalTestProvider = getTestProviderWithCustomState(localMockState);
      const { result } = renderTestHook(LocalTestProvider);
      await act(async () => {
        await result.current.updateSavedSearch(savedSearchMock, TimelineId.active);
      });

      expect(startServicesMock.savedSearch.save).toHaveBeenNthCalledWith(
        1,
        expect.objectContaining({
          timeRestore: true,
          timeRange: {
            from: 'now-20d',
            to: 'now',
          },
          tags: ['security-solution-default'],
          id: 'saved_search_id',
        }),
        expect.objectContaining({
          copyOnSave: false,
        })
      );
    });
    it('should raise appropriate notification in case of any error in saving discover saved search', () => {});
  });
});
