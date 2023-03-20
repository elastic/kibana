/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { AppMockRenderer } from '../../common/mock';
import { createAppMockRenderer } from '../../common/mock';
import '../../common/mock/match_media';
import { useCaseViewNavigation } from '../../common/navigation/hooks';
import type { UseGetCase } from '../../containers/use_get_case';
import { useGetCase } from '../../containers/use_get_case';
import { CaseViewTabs } from './case_view_tabs';
import { caseData, defaultGetCase } from './mocks';
import type { CaseViewTabsProps } from './case_view_tabs';
import { CASE_VIEW_PAGE_TABS } from '../../../common/types';

jest.mock('../../containers/use_get_case');
jest.mock('../../common/navigation/hooks');
jest.mock('../../common/hooks');

const useFetchCaseMock = useGetCase as jest.Mock;
const useCaseViewNavigationMock = useCaseViewNavigation as jest.Mock;

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

describe('CaseViewTabs', () => {
  let appMockRenderer: AppMockRenderer;

  beforeEach(() => {
    mockGetCase();

    appMockRenderer = createAppMockRenderer();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should render CaseViewTabs', async () => {
    const props = { activeTab: CASE_VIEW_PAGE_TABS.ACTIVITY, caseData };
    appMockRenderer.render(<CaseViewTabs {...props} />);

    expect(await screen.findByTestId('case-view-tab-title-activity')).toBeInTheDocument();
    expect(await screen.findByTestId('case-view-tab-title-alerts')).toBeInTheDocument();
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

  it('navigates to the activity tab when the activity tab is clicked', async () => {
    const navigateToCaseViewMock = useCaseViewNavigationMock().navigateToCaseView;
    appMockRenderer.render(<CaseViewTabs {...caseProps} />);

    userEvent.click(await screen.findByTestId('case-view-tab-title-activity'));

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

    userEvent.click(await screen.findByTestId('case-view-tab-title-alerts'));

    await waitFor(() => {
      expect(navigateToCaseViewMock).toHaveBeenCalledWith({
        detailName: caseData.id,
        tabId: CASE_VIEW_PAGE_TABS.ALERTS,
      });
    });
  });
});
