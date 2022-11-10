/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { render } from '@testing-library/react';
import { useLocation } from 'react-router-dom';
import { useVariationMock } from '../../../common/components/utils.mocks';
import { GlobalHeader } from '.';
import {
  ADD_DATA_PATH,
  ADD_THREAT_INTELLIGENCE_DATA_PATH,
  SecurityPageName,
  THREAT_INTELLIGENCE_PATH,
} from '../../../../common/constants';
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
import { tGridReducer } from '@kbn/timelines-plugin/public';

jest.mock('react-router-dom', () => {
  const actual = jest.requireActual('react-router-dom');
  return { ...actual, useLocation: jest.fn().mockReturnValue({ pathname: '' }) };
});

jest.mock('../../../common/lib/kibana', () => {
  const originalModule = jest.requireActual('../../../common/lib/kibana');
  return {
    ...originalModule,
    useKibana: jest.fn().mockReturnValue({
      services: { theme: { theme$: {} }, http: { basePath: { prepend: jest.fn((href) => href) } } },
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
  createHtmlPortalNode: () => ({ unmount: jest.fn() }),
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
  const store = createStore(
    state,
    SUB_PLUGINS_REDUCER,
    { dataTable: tGridReducer },
    kibanaObservable,
    storage
  );

  beforeEach(() => {
    useVariationMock.mockReset();
  });

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

  it('points to the default Add data URL', () => {
    (useLocation as jest.Mock).mockReturnValue([
      { pageName: SecurityPageName.overview, detailName: undefined },
    ]);
    const { queryByTestId } = render(
      <TestProviders store={store}>
        <GlobalHeader setHeaderActionMenu={mockSetHeaderActionMenu} />
      </TestProviders>
    );
    const link = queryByTestId('add-data');
    expect(link?.getAttribute('href')).toBe(ADD_DATA_PATH);
  });

  it('points to the threat_intel Add data URL for threat_intelligence url', () => {
    (useLocation as jest.Mock).mockReturnValue({ pathname: THREAT_INTELLIGENCE_PATH });
    const { queryByTestId } = render(
      <TestProviders store={store}>
        <GlobalHeader setHeaderActionMenu={mockSetHeaderActionMenu} />
      </TestProviders>
    );
    const link = queryByTestId('add-data');
    expect(link?.getAttribute('href')).toBe(ADD_THREAT_INTELLIGENCE_DATA_PATH);
  });

  it('points to the resolved Add data URL by useVariation', () => {
    (useLocation as jest.Mock).mockReturnValue([
      { pageName: SecurityPageName.overview, detailName: undefined },
    ]);

    const customResolvedUrl = '/test/url';
    useVariationMock.mockImplementationOnce(
      (cloudExperiments, featureFlagName, defaultValue, setter) => {
        setter(customResolvedUrl);
      }
    );
    const { queryByTestId } = render(
      <TestProviders store={store}>
        <GlobalHeader setHeaderActionMenu={mockSetHeaderActionMenu} />
      </TestProviders>
    );
    const link = queryByTestId('add-data');
    expect(link?.getAttribute('href')).toBe(customResolvedUrl);
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
    const mockStore = createStore(
      mockstate,
      SUB_PLUGINS_REDUCER,
      { dataTable: tGridReducer },
      kibanaObservable,
      storage
    );

    (useLocation as jest.Mock).mockReturnValue({ pathname: sourcererPaths[2] });

    const { queryByTestId } = render(
      <TestProviders store={mockStore}>
        <GlobalHeader setHeaderActionMenu={mockSetHeaderActionMenu} />
      </TestProviders>
    );

    expect(queryByTestId('sourcerer-trigger')).not.toBeInTheDocument();
  });
});
