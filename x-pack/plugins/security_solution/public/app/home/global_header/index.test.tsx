/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { render, waitFor } from '@testing-library/react';
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
  createMockStore,
  mockGlobalState,
  mockIndexPattern,
  TestProviders,
} from '../../../common/mock';
import { TimelineId } from '../../../../common/types/timeline';
import { sourcererPaths } from '../../../common/containers/sourcerer';

jest.mock('react-router-dom', () => {
  const actual = jest.requireActual('react-router-dom');
  return { ...actual, useLocation: jest.fn().mockReturnValue({ pathname: '' }) };
});

jest.mock('../../../common/lib/kibana');

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
  const store = createMockStore(state);

  beforeEach(() => {
    useVariationMock.mockReset();
  });

  it('has add data link', () => {
    (useLocation as jest.Mock).mockReturnValue([
      { pageName: SecurityPageName.overview, detailName: undefined },
    ]);
    const { getByText } = render(
      <TestProviders store={store}>
        <GlobalHeader />
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
        <GlobalHeader />
      </TestProviders>
    );
    const link = queryByTestId('add-data');
    expect(link?.getAttribute('href')).toBe(ADD_DATA_PATH);
  });

  it('points to the threat_intel Add data URL for threat_intelligence url', () => {
    (useLocation as jest.Mock).mockReturnValue({ pathname: THREAT_INTELLIGENCE_PATH });
    const { queryByTestId } = render(
      <TestProviders store={store}>
        <GlobalHeader />
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
        <GlobalHeader />
      </TestProviders>
    );
    const link = queryByTestId('add-data');
    expect(link?.getAttribute('href')).toBe(customResolvedUrl);
  });

  it.each(sourcererPaths)('shows sourcerer on %s page', (pathname) => {
    (useLocation as jest.Mock).mockReturnValue({ pathname });

    const { getByTestId } = render(
      <TestProviders store={store}>
        <GlobalHeader />
      </TestProviders>
    );
    expect(getByTestId('sourcerer-trigger')).toBeInTheDocument();
  });

  it('shows sourcerer on rule details page', () => {
    (useLocation as jest.Mock).mockReturnValue({ pathname: sourcererPaths[2] });

    const { getByTestId } = render(
      <TestProviders store={store}>
        <GlobalHeader />
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
    const mockStore = createMockStore(mockstate);

    (useLocation as jest.Mock).mockReturnValue({ pathname: sourcererPaths[2] });

    const { queryByTestId } = render(
      <TestProviders store={mockStore}>
        <GlobalHeader />
      </TestProviders>
    );

    expect(queryByTestId('sourcerer-trigger')).not.toBeInTheDocument();
  });

  it('shows AI Assistant header link', () => {
    (useLocation as jest.Mock).mockReturnValue([
      { pageName: SecurityPageName.overview, detailName: undefined },
    ]);

    const { findByTestId } = render(
      <TestProviders store={store}>
        <GlobalHeader />
      </TestProviders>
    );

    waitFor(() => expect(findByTestId('assistantHeaderLink')).toBeInTheDocument());
  });
});
