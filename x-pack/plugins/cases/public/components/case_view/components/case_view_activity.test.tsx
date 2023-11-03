/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import userEvent from '@testing-library/user-event';
import { screen, waitFor, within } from '@testing-library/react';
import { licensingMock } from '@kbn/licensing-plugin/public/mocks';
import {
  alertComment,
  basicCase,
  connectorsMock,
  getCaseUsersMockResponse,
  getUserAction,
} from '../../../containers/mock';
import type { AppMockRenderer } from '../../../common/mock';
import { createAppMockRenderer, noUpdateCasesPermissions } from '../../../common/mock';
import { CaseViewActivity } from './case_view_activity';
import type { CaseUI } from '../../../../common';
import { CASE_VIEW_PAGE_TABS } from '../../../../common/types';
import type { CaseViewProps } from '../types';
import { useFindCaseUserActions } from '../../../containers/use_find_case_user_actions';
import { usePostPushToService } from '../../../containers/use_post_push_to_service';
import { useGetSupportedActionConnectors } from '../../../containers/configure/use_get_supported_action_connectors';
import { useGetTags } from '../../../containers/use_get_tags';
import { useGetCategories } from '../../../containers/use_get_categories';
import { useGetCaseConnectors } from '../../../containers/use_get_case_connectors';
import { useGetCaseUsers } from '../../../containers/use_get_case_users';
import { waitForComponentToUpdate } from '../../../common/test_utils';
import { getCaseConnectorsMockResponse } from '../../../common/mock/connectors';
import { defaultInfiniteUseFindCaseUserActions, defaultUseFindCaseUserActions } from '../mocks';
import { useGetCaseUserActionsStats } from '../../../containers/use_get_case_user_actions_stats';
import { useInfiniteFindCaseUserActions } from '../../../containers/use_infinite_find_case_user_actions';
import { useOnUpdateField } from '../use_on_update_field';
import { useCasesFeatures } from '../../../common/use_cases_features';
import { ConnectorTypes, UserActionTypes } from '../../../../common/types/domain';
import { CaseMetricsFeature } from '../../../../common/types/api';

jest.mock('../../../containers/use_infinite_find_case_user_actions');
jest.mock('../../../containers/use_find_case_user_actions');
jest.mock('../../../containers/use_get_case_user_actions_stats');
jest.mock('../../../containers/configure/use_get_supported_action_connectors');
jest.mock('../../../containers/use_post_push_to_service');
jest.mock('../../user_actions/timestamp', () => ({
  UserActionTimestamp: () => <></>,
}));
jest.mock('../../../common/navigation/hooks');
jest.mock('../../../containers/use_get_action_license');
jest.mock('../../../containers/use_get_tags');
jest.mock('../../../containers/use_get_categories');
jest.mock('../../../containers/user_profiles/use_bulk_get_user_profiles');
jest.mock('../../../containers/use_get_case_connectors');
jest.mock('../../../containers/use_get_case_users');
jest.mock('../use_on_update_field');
jest.mock('../../../common/use_cases_features');

(useGetTags as jest.Mock).mockReturnValue({ data: ['coke', 'pepsi'], refetch: jest.fn() });
(useGetCategories as jest.Mock).mockReturnValue({ data: ['foo', 'bar'], refetch: jest.fn() });

const caseData: CaseUI = {
  ...basicCase,
  comments: [...basicCase.comments, alertComment],
  connector: {
    id: 'resilient-2',
    name: 'Resilient',
    type: ConnectorTypes.resilient,
    fields: null,
  },
};

const caseViewProps: CaseViewProps = {
  onComponentInitialized: jest.fn(),
  actionsNavigation: {
    href: jest.fn(),
    onClick: jest.fn(),
  },
  ruleDetailsNavigation: {
    href: jest.fn(),
    onClick: jest.fn(),
  },
  showAlertDetails: jest.fn(),
  useFetchAlertData: () => [
    false,
    {
      'alert-id-1': '1234',
      'alert-id-2': '1234',
    },
  ],
};

const userActivityQueryParams = {
  type: 'all',
  sortOrder: 'asc',
  page: 1,
  perPage: 10,
};

const pushCaseToExternalService = jest.fn();

const activityTab = CASE_VIEW_PAGE_TABS.ACTIVITY;

const userActionsStats = {
  total: 21,
  totalComments: 9,
  totalOtherActions: 11,
};

const caseProps = {
  ...caseViewProps,
  caseData,
  fetchCaseMetrics: jest.fn(),
  activeTab: activityTab,
};

const caseUsers = getCaseUsersMockResponse();
const useGetCasesFeaturesRes = {
  metricsFeatures: [CaseMetricsFeature.ALERTS_COUNT],
  pushToServiceAuthorized: true,
  caseAssignmentAuthorized: true,
  isAlertsEnabled: true,
  isSyncAlertsEnabled: true,
};

const useFindCaseUserActionsMock = useFindCaseUserActions as jest.Mock;
const useInfiniteFindCaseUserActionsMock = useInfiniteFindCaseUserActions as jest.Mock;
const useGetCaseUserActionsStatsMock = useGetCaseUserActionsStats as jest.Mock;
const useGetConnectorsMock = useGetSupportedActionConnectors as jest.Mock;
const usePostPushToServiceMock = usePostPushToService as jest.Mock;
const useGetCaseConnectorsMock = useGetCaseConnectors as jest.Mock;
const useGetCaseUsersMock = useGetCaseUsers as jest.Mock;
const useOnUpdateFieldMock = useOnUpdateField as jest.Mock;
const useCasesFeaturesMock = useCasesFeatures as jest.Mock;

describe('Case View Page activity tab', () => {
  const caseConnectors = getCaseConnectorsMockResponse();

  beforeAll(() => {
    useFindCaseUserActionsMock.mockReturnValue(defaultUseFindCaseUserActions);
    useInfiniteFindCaseUserActionsMock.mockReturnValue(defaultInfiniteUseFindCaseUserActions);
    useGetCaseUserActionsStatsMock.mockReturnValue({ data: userActionsStats, isLoading: false });
    useGetConnectorsMock.mockReturnValue({ data: connectorsMock, isLoading: false });
    usePostPushToServiceMock.mockReturnValue({
      isLoading: false,
      mutateAsync: pushCaseToExternalService,
    });
    useGetCaseConnectorsMock.mockReturnValue({
      isLoading: false,
      data: caseConnectors,
    });
    useOnUpdateFieldMock.mockReturnValue({
      isLoading: false,
      useOnUpdateField: jest.fn,
    });
  });
  let appMockRender: AppMockRenderer;

  const platinumLicense = licensingMock.createLicense({
    license: { type: 'platinum' },
  });

  const basicLicense = licensingMock.createLicense({
    license: { type: 'basic' },
  });

  beforeEach(() => {
    jest.clearAllMocks();
    appMockRender = createAppMockRenderer();

    useGetCaseUsersMock.mockReturnValue({ isLoading: false, data: caseUsers });
    useCasesFeaturesMock.mockReturnValue(useGetCasesFeaturesRes);
  });

  it('should render the activity content and main components', async () => {
    appMockRender = createAppMockRenderer({ license: platinumLicense });
    appMockRender.render(<CaseViewActivity {...caseProps} />);

    expect(await screen.findByTestId('case-view-activity')).toBeInTheDocument();
    expect(await screen.findAllByTestId('user-actions-list')).toHaveLength(2);
    expect(await screen.findByTestId('description')).toBeInTheDocument();
    expect(await screen.findByTestId('case-tags')).toBeInTheDocument();
    expect(await screen.findByTestId('cases-categories')).toBeInTheDocument();
    expect(await screen.findByTestId('connector-edit-header')).toBeInTheDocument();
    expect(await screen.findByTestId('case-view-status-action-button')).toBeInTheDocument();

    await waitForComponentToUpdate();
  });

  it('should call use get user actions as per top and bottom actions list', async () => {
    appMockRender = createAppMockRenderer({ license: platinumLicense });
    appMockRender.render(<CaseViewActivity {...caseProps} />);

    const lastPageForAll = Math.ceil(userActionsStats.total / userActivityQueryParams.perPage);

    await waitFor(() => {
      expect(useInfiniteFindCaseUserActionsMock).toHaveBeenCalledWith(
        caseData.id,
        userActivityQueryParams,
        true
      );
      expect(useFindCaseUserActionsMock).toHaveBeenCalledWith(
        caseData.id,
        { ...userActivityQueryParams, page: lastPageForAll },
        true
      );
    });
  });

  it('should not render the case view status button when the user does not have update permissions', async () => {
    appMockRender = createAppMockRenderer({
      permissions: noUpdateCasesPermissions(),
      license: platinumLicense,
    });

    appMockRender.render(<CaseViewActivity {...caseProps} />);
    expect(await screen.findByTestId('case-view-activity')).toBeInTheDocument();
    expect(await screen.findAllByTestId('user-actions-list')).toHaveLength(2);
    expect(await screen.findByTestId('case-tags')).toBeInTheDocument();
    expect(await screen.findByTestId('cases-categories')).toBeInTheDocument();
    expect(await screen.findByTestId('connector-edit-header')).toBeInTheDocument();
    expect(screen.queryByTestId('case-view-status-action-button')).not.toBeInTheDocument();

    await waitForComponentToUpdate();
  });

  it('should disable the severity selector when the user does not have update permissions', async () => {
    appMockRender = createAppMockRenderer({
      permissions: noUpdateCasesPermissions(),
      license: platinumLicense,
    });

    appMockRender.render(<CaseViewActivity {...caseProps} />);
    expect(await screen.findByTestId('case-view-activity')).toBeInTheDocument();
    expect(await screen.findAllByTestId('user-actions-list')).toHaveLength(2);
    expect(await screen.findByTestId('case-tags')).toBeInTheDocument();
    expect(await screen.findByTestId('cases-categories')).toBeInTheDocument();
    expect(await screen.findByTestId('connector-edit-header')).toBeInTheDocument();
    expect(await screen.findByTestId('case-severity-selection')).toBeDisabled();

    await waitForComponentToUpdate();
  });

  it('should show a loading when loading user actions stats', async () => {
    useGetCaseUserActionsStatsMock.mockReturnValue({ isLoading: true });
    appMockRender.render(<CaseViewActivity {...caseProps} />);
    expect(await screen.findByTestId('case-view-loading-content')).toBeInTheDocument();
    expect(screen.queryByTestId('case-view-activity')).not.toBeInTheDocument();
    expect(screen.queryByTestId('user-actions-list')).not.toBeInTheDocument();
  });

  it('should show a loading when updating severity ', async () => {
    useOnUpdateFieldMock.mockReturnValue({ isLoading: true, loadingKey: 'severity' });

    appMockRender.render(<CaseViewActivity {...caseProps} />);

    expect(
      (await screen.findByTestId('case-severity-selection')).classList.contains(
        'euiSuperSelectControl-isLoading'
      )
    ).toBeTruthy();
  });

  it('should not show a loading for severity when updating tags', async () => {
    useOnUpdateFieldMock.mockReturnValue({ isLoading: true, loadingKey: 'tags' });

    appMockRender.render(<CaseViewActivity {...caseProps} />);

    expect(
      (await screen.findByTestId('case-severity-selection')).classList.contains(
        'euiSuperSelectControl-isLoading'
      )
    ).not.toBeTruthy();
  });

  it('should not render the assignees on basic license', () => {
    useCasesFeaturesMock.mockReturnValue({
      ...useGetCasesFeaturesRes,
      caseAssignmentAuthorized: false,
    });

    appMockRender = createAppMockRenderer({ license: basicLicense });

    appMockRender.render(<CaseViewActivity {...caseProps} />);
    expect(screen.queryByTestId('case-view-assignees')).not.toBeInTheDocument();
  });

  it('should render the assignees on platinum license', async () => {
    appMockRender = createAppMockRenderer({ license: platinumLicense });

    appMockRender.render(<CaseViewActivity {...caseProps} />);
    expect(await screen.findByTestId('case-view-assignees')).toBeInTheDocument();

    await waitForComponentToUpdate();
  });

  it('should not render the connector on basic license', () => {
    useCasesFeaturesMock.mockReturnValue({
      ...useGetCasesFeaturesRes,
      pushToServiceAuthorized: false,
    });

    appMockRender = createAppMockRenderer({ license: basicLicense });

    appMockRender.render(<CaseViewActivity {...caseProps} />);
    expect(screen.queryByTestId('case-view-edit-connector')).not.toBeInTheDocument();
  });

  it('should render the connector on platinum license', async () => {
    appMockRender = createAppMockRenderer({ license: platinumLicense });

    appMockRender.render(<CaseViewActivity {...caseProps} />);

    expect(await screen.findByTestId('case-view-edit-connector')).toBeInTheDocument();
  });

  describe('filter activity', () => {
    beforeEach(() => {
      jest.clearAllMocks();
      useFindCaseUserActionsMock.mockReturnValue(defaultUseFindCaseUserActions);
      useInfiniteFindCaseUserActionsMock.mockReturnValue(defaultInfiniteUseFindCaseUserActions);
      useGetCaseUserActionsStatsMock.mockReturnValue({
        data: userActionsStats,
        isLoading: false,
      });
    });

    it('should call user action hooks correctly when filtering for all', async () => {
      appMockRender.render(<CaseViewActivity {...caseProps} />);

      const lastPageForAll = Math.ceil(userActionsStats.total / userActivityQueryParams.perPage);

      userEvent.click(await screen.findByTestId('user-actions-filter-activity-button-all'));

      expect(useInfiniteFindCaseUserActionsMock).toHaveBeenCalledWith(
        caseData.id,
        userActivityQueryParams,
        true
      );

      expect(useFindCaseUserActionsMock).toHaveBeenCalledWith(
        caseData.id,
        { ...userActivityQueryParams, page: lastPageForAll },
        true
      );

      expect(useGetCaseUserActionsStatsMock).toHaveBeenCalledWith(caseData.id);
    });

    it('should call user action hooks correctly when filtering for comments', async () => {
      appMockRender.render(<CaseViewActivity {...caseProps} />);

      const lastPageForComment = Math.ceil(
        userActionsStats.totalComments / userActivityQueryParams.perPage
      );

      userEvent.click(await screen.findByTestId('user-actions-filter-activity-button-comments'));

      expect(useGetCaseUserActionsStatsMock).toHaveBeenCalledWith(caseData.id);
      expect(useInfiniteFindCaseUserActionsMock).toHaveBeenCalledWith(
        caseData.id,
        { ...userActivityQueryParams, type: 'user' },
        true
      );
      expect(useFindCaseUserActionsMock).toHaveBeenCalledWith(
        caseData.id,
        { ...userActivityQueryParams, type: 'user', page: lastPageForComment },
        false
      );
    });

    it('should call user action hooks correctly when filtering for history', async () => {
      appMockRender.render(<CaseViewActivity {...caseProps} />);

      const lastPageForHistory = Math.ceil(
        userActionsStats.totalOtherActions / userActivityQueryParams.perPage
      );

      userEvent.click(await screen.findByTestId('user-actions-filter-activity-button-history'));

      expect(useGetCaseUserActionsStatsMock).toHaveBeenCalledWith(caseData.id);
      expect(useInfiniteFindCaseUserActionsMock).toHaveBeenCalledWith(
        caseData.id,
        { ...userActivityQueryParams, type: 'action' },
        true
      );
      expect(useFindCaseUserActionsMock).toHaveBeenCalledWith(
        caseData.id,
        { ...userActivityQueryParams, type: 'action', page: lastPageForHistory },
        true
      );
    });
  });

  describe('Case users', () => {
    describe('Assignees', () => {
      it('should render assignees in the participants section', async () => {
        appMockRender = createAppMockRenderer({ license: platinumLicense });
        appMockRender.render(
          <CaseViewActivity
            {...caseProps}
            caseData={{
              ...caseProps.caseData,
              assignees: caseUsers.assignees.map((assignee) => ({
                uid: assignee.uid ?? 'not-valid',
              })),
            }}
          />
        );

        const assigneesSection = within(await screen.findByTestId('case-view-assignees'));

        expect(await assigneesSection.findByText('Unknown')).toBeInTheDocument();
        expect(await assigneesSection.findByText('Fuzzy Marten')).toBeInTheDocument();
        expect(await assigneesSection.findByText('elastic')).toBeInTheDocument();
        expect(await assigneesSection.findByText('Misty Mackerel')).toBeInTheDocument();
      });
    });

    describe('User actions', () => {
      it('renders the unassigned users correctly', async () => {
        useFindCaseUserActionsMock.mockReturnValue({
          ...defaultUseFindCaseUserActions,
          data: {
            userActions: [getUserAction(UserActionTypes.assignees, 'delete')],
          },
        });

        appMockRender = createAppMockRenderer();
        appMockRender.render(<CaseViewActivity {...caseProps} />);

        const userActions = within((await screen.findAllByTestId('user-actions-list'))[1]);

        expect(await userActions.findByText('cases_no_connectors')).toBeInTheDocument();
        expect(await userActions.findByText('Valid Chimpanzee')).toBeInTheDocument();
      });

      it('renders the assigned users correctly', async () => {
        useFindCaseUserActionsMock.mockReturnValue({
          ...defaultUseFindCaseUserActions,
          data: {
            userActions: [
              getUserAction(UserActionTypes.assignees, 'add', {
                payload: {
                  assignees: [
                    { uid: 'not-valid' },
                    { uid: 'u_3OgKOf-ogtr8kJ5B0fnRcqzXs2aQQkZLtzKEEFnKaYg_0' },
                  ],
                },
              }),
            ],
          },
        });

        appMockRender = createAppMockRenderer();
        appMockRender.render(<CaseViewActivity {...caseProps} />);

        const userActions = within((await screen.findAllByTestId('user-actions-list'))[1]);

        expect(await userActions.findByText('Fuzzy Marten')).toBeInTheDocument();
        expect(await userActions.findByText('Unknown')).toBeInTheDocument();
      });

      it('renders the user action users correctly', async () => {
        useFindCaseUserActionsMock.mockReturnValue({
          ...defaultUseFindCaseUserActions,
          data: {
            userActions: [
              getUserAction('description', 'create'),
              getUserAction('description', 'update', {
                createdBy: {
                  ...caseUsers.participants[0].user,
                  fullName: caseUsers.participants[0].user.full_name,
                  profileUid: caseUsers.participants[0].uid,
                },
              }),
              getUserAction('comment', 'update', {
                createdBy: {
                  ...caseUsers.participants[1].user,
                  fullName: caseUsers.participants[1].user.full_name,
                  profileUid: caseUsers.participants[1].uid,
                },
              }),
              getUserAction('description', 'update', {
                createdBy: {
                  ...caseUsers.participants[2].user,
                  fullName: caseUsers.participants[2].user.full_name,
                  profileUid: caseUsers.participants[2].uid,
                },
              }),
              getUserAction('title', 'update', {
                createdBy: {
                  ...caseUsers.participants[3].user,
                  fullName: caseUsers.participants[3].user.full_name,
                  profileUid: caseUsers.participants[3].uid,
                },
              }),
              getUserAction('tags', 'add', {
                createdBy: {
                  ...caseUsers.participants[4].user,
                  fullName: caseUsers.participants[4].user.full_name,
                  profileUid: caseUsers.participants[4].uid,
                },
              }),
            ],
          },
        });

        appMockRender = createAppMockRenderer();
        appMockRender.render(<CaseViewActivity {...caseProps} />);

        const userActions = within((await screen.findAllByTestId('user-actions-list'))[1]);

        expect(await userActions.findByText('Participant 1')).toBeInTheDocument();
        expect(await userActions.findByText('participant_2@elastic.co')).toBeInTheDocument();
        expect(await userActions.findByText('participant_3')).toBeInTheDocument();
        expect(await userActions.findByText('P4')).toBeInTheDocument();
        expect(await userActions.findByText('Participant 5')).toBeInTheDocument();
      });
    });

    describe('Category', () => {
      it('should show the category correctly', async () => {
        appMockRender.render(
          <CaseViewActivity
            {...caseProps}
            caseData={{
              ...caseProps.caseData,
              category: 'My category',
            }}
          />
        );

        expect(await screen.findByText('My category'));
      });
    });
  });
});
