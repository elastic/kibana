/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { act, waitFor, within, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { AppMockRenderer } from '../../common/mock';
import { createAppMockRenderer } from '../../common/mock';
import '../../common/mock/match_media';
import { useCaseViewNavigation } from '../../common/navigation/hooks';
import type { UseGetCase } from '../../containers/use_get_case';
import { useGetCase } from '../../containers/use_get_case';
import { useUpdateCase } from '../../containers/use_update_case';
import { CaseViewTabs } from './case_view_tabs';
import { caseData, defaultGetCase, defaultUpdateCaseState } from './mocks';
import type { CaseViewTabsProps } from './case_view_tabs';
import { userProfiles } from '../../containers/user_profiles/api.mock';
import { licensingMock } from '@kbn/licensing-plugin/public/mocks';
import { CASE_VIEW_PAGE_TABS } from '../../../common/types';

jest.mock('../../containers/use_update_case');
jest.mock('../../containers/use_get_case');
jest.mock('../../common/navigation/hooks');
jest.mock('../../common/hooks');
jest.mock('../connectors/resilient/api');

const useFetchCaseMock = useGetCase as jest.Mock;
const useCaseViewNavigationMock = useCaseViewNavigation as jest.Mock;
const useUpdateCaseMock = useUpdateCase as jest.Mock;

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
    jest.clearAllMocks();
    useUpdateCaseMock.mockReturnValue(defaultUpdateCaseState);

    const license = licensingMock.createLicense({
      license: { type: 'platinum' },
    });

    appMockRenderer = createAppMockRenderer({ license });
  });

  it('should render CaseViewTabs', async () => {
    const damagedRaccoonUser = userProfiles[0].user;
    const caseDataWithDamagedRaccoon = {
      ...caseData,
      createdBy: {
        profileUid: userProfiles[0].uid,
        username: damagedRaccoonUser.username,
        fullName: damagedRaccoonUser.full_name,
        email: damagedRaccoonUser.email,
      },
    };

    const license = licensingMock.createLicense({
      license: { type: 'platinum' },
    });

    const props = { activeTab: CASE_VIEW_PAGE_TABS.ACTIVITY, caseData: caseDataWithDamagedRaccoon };
    appMockRenderer = createAppMockRenderer({ features: { metrics: ['alerts.count'] }, license });
    appMockRenderer.render(<CaseViewTabs {...props} />);

    expect(screen.getByTestId('case-view-tab-title-activity')).toBeInTheDocument();
    expect(screen.getByTestId('case-view-tab-title-alerts')).toBeInTheDocument();
    expect(screen.getByTestId('description-wrapper')).toBeInTheDocument();
  });

  it('should display description isLoading', async () => {
    useUpdateCaseMock.mockImplementation(() => ({
      ...defaultUpdateCaseState,
      isLoading: true,
      updateKey: 'description',
    }));

    appMockRenderer.render(<CaseViewTabs {...caseProps} />);

    await waitFor(() => {
      expect(screen.getByTestId('description-loading')).toBeInTheDocument();
      expect(screen.queryByTestId('description-action')).not.toBeInTheDocument();
    });
  });

  it('renders the descriptions user correctly', async () => {
    appMockRenderer.render(<CaseViewTabs {...caseProps} />);

    const description = within(screen.getByTestId('description-action'));

    await waitFor(() => {
      expect(description.getByText('Leslie Knope')).toBeInTheDocument();
    });
  });

  it('renders tabs correctly', async () => {
    const result = appMockRenderer.render(<CaseViewTabs {...caseProps} />);
    await act(async () => {
      expect(result.getByTestId('case-view-tab-title-activity')).toBeInTheDocument();
      expect(result.getByTestId('case-view-tab-title-alerts')).toBeInTheDocument();
    });
  });

  it('renders the activity tab by default', async () => {
    const result = appMockRenderer.render(<CaseViewTabs {...caseProps} />);
    await act(async () => {
      expect(result.getByTestId('case-view-tab-title-activity')).toHaveAttribute(
        'aria-selected',
        'true'
      );
    });
  });

  it('shows the alerts tab as active', async () => {
    const result = appMockRenderer.render(
      <CaseViewTabs {...caseProps} activeTab={CASE_VIEW_PAGE_TABS.ALERTS} />
    );
    await act(async () => {
      expect(result.getByTestId('case-view-tab-title-alerts')).toHaveAttribute(
        'aria-selected',
        'true'
      );
    });
  });

  it('navigates to the activity tab when the activity tab is clicked', async () => {
    const navigateToCaseViewMock = useCaseViewNavigationMock().navigateToCaseView;
    const result = appMockRenderer.render(<CaseViewTabs {...caseProps} />);
    userEvent.click(result.getByTestId('case-view-tab-title-activity'));
    await act(async () => {
      expect(navigateToCaseViewMock).toHaveBeenCalledWith({
        detailName: caseData.id,
        tabId: CASE_VIEW_PAGE_TABS.ACTIVITY,
      });
    });
  });

  it('navigates to the alerts tab when the alerts tab is clicked', async () => {
    const navigateToCaseViewMock = useCaseViewNavigationMock().navigateToCaseView;
    const result = appMockRenderer.render(<CaseViewTabs {...caseProps} />);
    userEvent.click(result.getByTestId('case-view-tab-title-alerts'));
    await act(async () => {
      expect(navigateToCaseViewMock).toHaveBeenCalledWith({
        detailName: caseData.id,
        tabId: CASE_VIEW_PAGE_TABS.ALERTS,
      });
    });
  });
});
