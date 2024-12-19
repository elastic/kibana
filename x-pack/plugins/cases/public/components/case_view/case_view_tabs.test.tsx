/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { licensingMock } from '@kbn/licensing-plugin/public/mocks';

import type { AppMockRenderer } from '../../common/mock';
import type { UseGetCase } from '../../containers/use_get_case';
import type { CaseViewTabsProps } from './case_view_tabs';

import { CASE_VIEW_PAGE_TABS } from '../../../common/types';
import { createAppMockRenderer } from '../../common/mock';
import { useCaseViewNavigation } from '../../common/navigation/hooks';
import { useGetCase } from '../../containers/use_get_case';
import { CaseViewTabs } from './case_view_tabs';
import { caseData, defaultGetCase } from './mocks';
import { useGetCaseFileStats } from '../../containers/use_get_case_file_stats';
import { useCaseObservables } from './use_case_observables';

jest.mock('../../containers/use_get_case');
jest.mock('../../common/navigation/hooks');
jest.mock('../../common/hooks');
jest.mock('../../containers/use_get_case_file_stats');
jest.mock('./use_case_observables');

const useFetchCaseMock = useGetCase as jest.Mock;
const useCaseViewNavigationMock = useCaseViewNavigation as jest.Mock;
const useGetCaseFileStatsMock = useGetCaseFileStats as jest.Mock;
const useGetCaseObservablesMock = useCaseObservables as jest.Mock;

const mockGetCase = (props: Partial<UseGetCase> = {}) => {
  const data = {
    ...defaultGetCase.data,
    ...props.data,
  };
  useFetchCaseMock.mockReturnValue({
    ...defaultGetCase,
    ...props,
    data,
  });
};

export const caseProps: CaseViewTabsProps = {
  caseData,
  activeTab: CASE_VIEW_PAGE_TABS.ACTIVITY,
};

export const casePropsWithAlerts: CaseViewTabsProps = {
  ...caseProps,
  caseData: { ...caseData, totalAlerts: 3 },
};

describe('CaseViewTabs', () => {
  let appMockRenderer: AppMockRenderer;
  const data = { total: 3 };

  beforeEach(() => {
    useGetCaseObservablesMock.mockReturnValue({ isLoading: false, observables: [] });
    useGetCaseFileStatsMock.mockReturnValue({ data });
    mockGetCase();

    const license = licensingMock.createLicense({
      license: { type: 'basic' },
    });

    appMockRenderer = createAppMockRenderer({ license });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should render CaseViewTabs', async () => {
    const props = { activeTab: CASE_VIEW_PAGE_TABS.ACTIVITY, caseData };
    appMockRenderer.render(<CaseViewTabs {...props} />);

    expect(await screen.findByTestId('case-view-tab-title-activity')).toBeInTheDocument();
    expect(await screen.findByTestId('case-view-tab-title-alerts')).toBeInTheDocument();
    expect(await screen.findByTestId('case-view-tab-title-files')).toBeInTheDocument();
  });

  it('renders the activity tab by default', async () => {
    appMockRenderer.render(<CaseViewTabs {...caseProps} />);

    expect(await screen.findByTestId('case-view-tab-title-activity')).toHaveAttribute(
      'aria-selected',
      'true'
    );
  });

  it('shows the alerts tab as active', async () => {
    appMockRenderer.render(<CaseViewTabs {...caseProps} activeTab={CASE_VIEW_PAGE_TABS.ALERTS} />);

    expect(await screen.findByTestId('case-view-tab-title-alerts')).toHaveAttribute(
      'aria-selected',
      'true'
    );
  });

  it('shows the files tab as active', async () => {
    appMockRenderer.render(<CaseViewTabs {...caseProps} activeTab={CASE_VIEW_PAGE_TABS.FILES} />);

    expect(await screen.findByTestId('case-view-tab-title-files')).toHaveAttribute(
      'aria-selected',
      'true'
    );
  });

  it('shows the files tab with the correct count', async () => {
    appMockRenderer.render(<CaseViewTabs {...caseProps} activeTab={CASE_VIEW_PAGE_TABS.FILES} />);

    const badge = await screen.findByTestId('case-view-files-stats-badge');

    expect(badge).toHaveTextContent('3');
  });

  it('do not show count on the files tab if the call isLoading', async () => {
    useGetCaseFileStatsMock.mockReturnValue({ isLoading: true, data });

    appMockRenderer.render(<CaseViewTabs {...caseProps} activeTab={CASE_VIEW_PAGE_TABS.FILES} />);

    expect(screen.queryByTestId('case-view-files-stats-badge')).not.toBeInTheDocument();
  });

  it('shows the alerts tab with the correct count', async () => {
    appMockRenderer.render(
      <CaseViewTabs {...casePropsWithAlerts} activeTab={CASE_VIEW_PAGE_TABS.ALERTS} />
    );

    const badge = await screen.findByTestId('case-view-alerts-stats-badge');

    expect(badge).toHaveTextContent('3');
  });

  it('the alerts tab count has a different color if the tab is not active', async () => {
    appMockRenderer.render(
      <CaseViewTabs {...casePropsWithAlerts} activeTab={CASE_VIEW_PAGE_TABS.FILES} />
    );

    expect(
      (await screen.findByTestId('case-view-alerts-stats-badge')).getAttribute('class')
    ).not.toMatch(/accent/);
  });

  it('navigates to the activity tab when the activity tab is clicked', async () => {
    const navigateToCaseViewMock = useCaseViewNavigationMock().navigateToCaseView;
    appMockRenderer.render(<CaseViewTabs {...caseProps} />);

    await userEvent.click(await screen.findByTestId('case-view-tab-title-activity'));

    await waitFor(() => {
      expect(navigateToCaseViewMock).toHaveBeenCalledWith({
        detailName: caseData.id,
        tabId: CASE_VIEW_PAGE_TABS.ACTIVITY,
      });
    });
  });

  it('navigates to the alerts tab when the alerts tab is clicked', async () => {
    const navigateToCaseViewMock = useCaseViewNavigationMock().navigateToCaseView;
    appMockRenderer.render(<CaseViewTabs {...caseProps} />);

    await userEvent.click(await screen.findByTestId('case-view-tab-title-alerts'));

    await waitFor(() => {
      expect(navigateToCaseViewMock).toHaveBeenCalledWith({
        detailName: caseData.id,
        tabId: CASE_VIEW_PAGE_TABS.ALERTS,
      });
    });
  });

  it('navigates to the files tab when the files tab is clicked', async () => {
    const navigateToCaseViewMock = useCaseViewNavigationMock().navigateToCaseView;
    appMockRenderer.render(<CaseViewTabs {...caseProps} />);

    await userEvent.click(await screen.findByTestId('case-view-tab-title-files'));

    await waitFor(() => {
      expect(navigateToCaseViewMock).toHaveBeenCalledWith({
        detailName: caseData.id,
        tabId: CASE_VIEW_PAGE_TABS.FILES,
      });
    });
  });

  it('should display the alerts tab when the feature is enabled', async () => {
    appMockRenderer = createAppMockRenderer({ features: { alerts: { enabled: true } } });

    appMockRenderer.render(
      <CaseViewTabs {...casePropsWithAlerts} activeTab={CASE_VIEW_PAGE_TABS.ALERTS} />
    );

    expect(await screen.findByTestId('case-view-tab-title-alerts')).toBeInTheDocument();
  });

  it('should not display the alerts tab when the feature is disabled', async () => {
    appMockRenderer = createAppMockRenderer({ features: { alerts: { enabled: false } } });

    appMockRenderer.render(
      <CaseViewTabs {...casePropsWithAlerts} activeTab={CASE_VIEW_PAGE_TABS.ALERTS} />
    );

    expect(await screen.findByTestId('case-view-tabs')).toBeInTheDocument();
    expect(screen.queryByTestId('case-view-tab-title-alerts')).not.toBeInTheDocument();
  });

  it('should not show the experimental badge on the alerts table', async () => {
    appMockRenderer = createAppMockRenderer({
      features: { alerts: { isExperimental: false } },
    });

    appMockRenderer.render(
      <CaseViewTabs {...casePropsWithAlerts} activeTab={CASE_VIEW_PAGE_TABS.ALERTS} />
    );

    expect(await screen.findByTestId('case-view-tabs')).toBeInTheDocument();
    expect(
      screen.queryByTestId('case-view-alerts-table-experimental-badge')
    ).not.toBeInTheDocument();
  });

  it('should show the experimental badge on the alerts table', async () => {
    appMockRenderer = createAppMockRenderer({
      features: { alerts: { isExperimental: true } },
    });

    appMockRenderer.render(
      <CaseViewTabs {...casePropsWithAlerts} activeTab={CASE_VIEW_PAGE_TABS.ALERTS} />
    );

    expect(
      await screen.findByTestId('case-view-alerts-table-experimental-badge')
    ).toBeInTheDocument();
  });

  it('should not show observable tabs in non-platinum tiers', async () => {
    appMockRenderer = createAppMockRenderer();

    appMockRenderer.render(
      <CaseViewTabs {...casePropsWithAlerts} activeTab={CASE_VIEW_PAGE_TABS.OBSERVABLES} />
    );

    expect(screen.queryByTestId('case-view-tab-title-observables')).not.toBeInTheDocument();
    expect(screen.queryByTestId('case-view-tab-title-similar_cases')).not.toBeInTheDocument();
  });

  describe('show observable tabs in platinum tier or higher', () => {
    beforeEach(() => {
      const license = licensingMock.createLicense({
        license: { type: 'platinum' },
      });
      appMockRenderer = createAppMockRenderer({ license });
    });

    it('should show the observables tab', async () => {
      appMockRenderer.render(
        <CaseViewTabs {...casePropsWithAlerts} activeTab={CASE_VIEW_PAGE_TABS.OBSERVABLES} />
      );

      expect(await screen.findByTestId('case-view-tab-title-observables')).toBeInTheDocument();
    });

    it('should show the similar cases tab', async () => {
      appMockRenderer.render(
        <CaseViewTabs {...casePropsWithAlerts} activeTab={CASE_VIEW_PAGE_TABS.SIMILAR_CASES} />
      );

      expect(await screen.findByTestId('case-view-tab-title-similar_cases')).toBeInTheDocument();
    });

    it('navigates to the similar cases tab when the similar cases tab is clicked', async () => {
      const navigateToCaseViewMock = useCaseViewNavigationMock().navigateToCaseView;
      appMockRenderer.render(<CaseViewTabs {...caseProps} />);

      await userEvent.click(await screen.findByTestId('case-view-tab-title-similar_cases'));

      await waitFor(() => {
        expect(navigateToCaseViewMock).toHaveBeenCalledWith({
          detailName: caseData.id,
          tabId: CASE_VIEW_PAGE_TABS.SIMILAR_CASES,
        });
      });
    });

    it('shows the observables tab with the correct count', async () => {
      appMockRenderer.render(
        <CaseViewTabs {...caseProps} activeTab={CASE_VIEW_PAGE_TABS.OBSERVABLES} />
      );

      const badge = await screen.findByTestId('case-view-observables-stats-badge');

      expect(badge).toHaveTextContent('0');
    });

    it('do not show count on the observables tab if the call isLoading', async () => {
      useGetCaseObservablesMock.mockReturnValue({ isLoading: true, observables: [] });

      appMockRenderer.render(
        <CaseViewTabs {...caseProps} activeTab={CASE_VIEW_PAGE_TABS.OBSERVABLES} />
      );

      expect(screen.queryByTestId('case-view-observables-stats-badge')).not.toBeInTheDocument();
    });
  });
});
