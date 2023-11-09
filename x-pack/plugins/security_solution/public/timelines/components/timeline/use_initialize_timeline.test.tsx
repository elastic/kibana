/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { renderHook } from '@testing-library/react-hooks';
import { mockBrowserFields } from '../../../common/containers/source/mock';
import { TimelineId } from '../../../../common/types/timeline';
import {
  createSecuritySolutionStorageMock,
  kibanaObservable,
  mockGlobalState,
  mockIndexNames,
  mockIndexPattern,
  SUB_PLUGINS_REDUCER,
  TestProviders,
} from '../../../common/mock';
import { useSourcererDataView } from '../../../common/containers/sourcerer';
import { createStore } from '../../../common/store';
import { SourcererScopeName } from '../../../common/store/sourcerer/model';
import { useInitializeTimeline } from './use_initialize_timeline';

const mockDispatch = jest.fn();

jest.mock('react-redux', () => {
  const actual = jest.requireActual('react-redux');
  return {
    ...actual,
    useDispatch: () => mockDispatch,
  };
});

const mockUseSourcererDataView: jest.Mock = useSourcererDataView as jest.Mock;
jest.mock('../../../common/containers/sourcerer');
const mockDataView = {
  dataViewId: mockGlobalState.timeline.timelineById[TimelineId.test]?.dataViewId,
  browserFields: mockBrowserFields,
  loading: false,
  indexPattern: mockIndexPattern,
  pageInfo: { activePage: 0, querySize: 0 },
  selectedPatterns: mockGlobalState.timeline.timelineById[TimelineId.test]?.indexNames,
};
mockUseSourcererDataView.mockReturnValue(mockDataView);

describe('StatefulTimeline', () => {
  const { storage } = createSecuritySolutionStorageMock();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should not update timeline when create timeline and timeline savedObjectId: null', () => {
    renderHook(useInitializeTimeline, {
      initialProps: { timelineId: TimelineId.test },
      wrapper: ({ children }) => <TestProviders>{children}</TestProviders>,
    });
    expect(mockDispatch).toBeCalledTimes(1);
    expect(mockDispatch.mock.calls[0][0].payload.indexNames).toEqual(
      mockGlobalState.sourcerer.sourcererScopes[SourcererScopeName.timeline].selectedPatterns
    );
  });

  it('should not update timeline when sourcerer data view updates and timeline already matches the data view', () => {
    renderHook(useInitializeTimeline, {
      initialProps: { timelineId: TimelineId.test },
      wrapper: ({ children }) => (
        <TestProviders
          store={createStore(
            {
              ...mockGlobalState,
              timeline: {
                ...mockGlobalState.timeline,
                timelineById: {
                  [TimelineId.test]: {
                    ...mockGlobalState.timeline.timelineById[TimelineId.test],
                    savedObjectId: 'definitely-not-null',
                    indexNames:
                      mockGlobalState.sourcerer.sourcererScopes[SourcererScopeName.timeline]
                        .selectedPatterns,
                  },
                },
              },
            },
            SUB_PLUGINS_REDUCER,
            kibanaObservable,
            storage
          )}
        >
          {children}
        </TestProviders>
      ),
    });
    expect(mockDispatch).not.toHaveBeenCalled();
  });

  it('should update timeline when sourcerer data view updates', () => {
    renderHook(useInitializeTimeline, {
      initialProps: { timelineId: TimelineId.test },
      wrapper: ({ children }) => (
        <TestProviders
          store={createStore(
            {
              ...mockGlobalState,
              timeline: {
                ...mockGlobalState.timeline,
                timelineById: {
                  [TimelineId.test]: {
                    ...mockGlobalState.timeline.timelineById[TimelineId.test],
                    savedObjectId: 'definitely-not-null',
                  },
                },
              },
              sourcerer: {
                ...mockGlobalState.sourcerer,
                sourcererScopes: {
                  ...mockGlobalState.sourcerer.sourcererScopes,
                  [SourcererScopeName.timeline]: {
                    ...mockGlobalState.sourcerer.sourcererScopes[SourcererScopeName.timeline],
                    selectedPatterns: mockIndexNames,
                  },
                },
              },
            },
            SUB_PLUGINS_REDUCER,
            kibanaObservable,
            storage
          )}
        >
          {children}
        </TestProviders>
      ),
    });
    expect(mockDispatch).toBeCalledTimes(1);
    expect(mockDispatch).toHaveBeenNthCalledWith(1, {
      payload: {
        id: TimelineId.test,
        dataViewId: mockDataView.dataViewId,
        indexNames: mockIndexNames,
      },
      type: 'x-pack/security_solution/local/timeline/UPDATE_DATA_VIEW',
    });
  });
});
