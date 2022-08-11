/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { render } from '@testing-library/react';
import { useLocation } from 'react-router-dom';
import { GlobalHeader } from '.';
import { SecurityPageName } from '../../../../common/constants';
import {
  createSecuritySolutionStorageMock,
  mockGlobalState,
  mockIndexPattern,
  SUB_PLUGINS_REDUCER,
  TestProviders,
} from '../../../common/mock';
import { TimelineId } from '../../../../common/types/timeline';
import { createStore } from '../../../common/store';
import { kibanaObservable } from '@kbn/timelines-plugin/public/mock';
import { sourcererPaths } from '../../../common/containers/sourcerer';

jest.mock('react-router-dom', () => {
  const actual = jest.requireActual('react-router-dom');
  return { ...actual, useLocation: jest.fn().mockReturnValue({ pathname: '' }) };
});

jest.mock('../../../common/lib/kibana', () => {
  const originalModule = jest.requireActual('../../../common/lib/kibana');
  return {
    ...originalModule,
    useKibana: jest.fn().mockReturnValue({
      services: { theme: { theme$: {} }, http: { basePath: { prepend: jest.fn() } } },
    }),
    useUiSetting$: jest.fn().mockReturnValue([]),
  };
});

jest.mock('../../../common/containers/source', () => ({
  useFetchIndex: () => [false, { indicesExist: true, indexPatterns: mockIndexPattern }],
}));

jest.mock('../../../common/containers/sourcerer/use_signal_helpers', () => ({
  useSignalHelpers: () => ({ signalIndexNeedsInit: false }),
}));

jest.mock('react-reverse-portal', () => ({
  InPortal: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  OutPortal: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  createPortalNode: () => ({ unmount: jest.fn() }),
}));

describe('global header', () => {
  const mockSetHeaderActionMenu = jest.fn();
  const state = {
    ...mockGlobalState,
    timeline: {
      ...mockGlobalState.timeline,
      timelineById: {
        [TimelineId.active]: {
          ...mockGlobalState.timeline.timelineById.test,
          show: false,
        },
      },
    },
  };
  const { storage } = createSecuritySolutionStorageMock();
  const store = createStore(state, SUB_PLUGINS_REDUCER, kibanaObservable, storage);

  it('has add data link', () => {
    (useLocation as jest.Mock).mockReturnValue([
      { pageName: SecurityPageName.overview, detailName: undefined },
    ]);
    const { getByText } = render(
      <TestProviders store={store}>
        <GlobalHeader setHeaderActionMenu={mockSetHeaderActionMenu} />
      </TestProviders>
    );
    expect(getByText('Add integrations')).toBeInTheDocument();
  });

  it.each(sourcererPaths)('shows sourcerer on %s page', (pathname) => {
    (useLocation as jest.Mock).mockReturnValue({ pathname });

    const { getByTestId } = render(
      <TestProviders store={store}>
        <GlobalHeader setHeaderActionMenu={mockSetHeaderActionMenu} />
      </TestProviders>
    );
    expect(getByTestId('sourcerer-trigger')).toBeInTheDocument();
  });

  it('shows sourcerer on rule details page', () => {
    (useLocation as jest.Mock).mockReturnValue({ pathname: sourcererPaths[2] });

    const { getByTestId } = render(
      <TestProviders store={store}>
        <GlobalHeader setHeaderActionMenu={mockSetHeaderActionMenu} />
      </TestProviders>
    );
    expect(getByTestId('sourcerer-trigger')).toBeInTheDocument();
  });

  it('shows no sourcerer if timeline is open', () => {
    const mockstate = {
      ...mockGlobalState,
      timeline: {
        ...mockGlobalState.timeline,
        timelineById: {
          [TimelineId.active]: {
            ...mockGlobalState.timeline.timelineById.test,
            show: true,
          },
        },
      },
    };
    const mockStore = createStore(mockstate, SUB_PLUGINS_REDUCER, kibanaObservable, storage);

    (useLocation as jest.Mock).mockReturnValue({ pathname: sourcererPaths[2] });

    const { queryByTestId } = render(
      <TestProviders store={mockStore}>
        <GlobalHeader setHeaderActionMenu={mockSetHeaderActionMenu} />
      </TestProviders>
    );

    expect(queryByTestId('sourcerer-trigger')).not.toBeInTheDocument();
  });
});
