/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { waitFor, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
// eslint-disable-next-line @kbn/eslint/module_migration
import routeData from 'react-router';

import { useUpdateComment } from '../../containers/use_update_comment';
import { basicCase } from '../../containers/mock';
import { UserActionsList } from './user_actions_list';
import type { AppMockRenderer } from '../../common/mock';
import { createAppMockRenderer } from '../../common/mock';
import { connectorsMock, getCaseConnectorsMockResponse } from '../../common/mock/connectors';
import type { UserActivityParams } from '../user_actions_activity_bar/types';
import { useFindCaseUserActions } from '../../containers/use_find_case_user_actions';
import {
  defaultUseFindCaseUserActions,
  defaultInfiniteUseFindCaseUserActions,
} from '../case_view/mocks';
import { useInfiniteFindCaseUserActions } from '../../containers/use_infinite_find_case_user_actions';

const fetchUserActions = jest.fn();
const onUpdateField = jest.fn();
const updateCase = jest.fn();
const onShowAlertDetails = jest.fn();

const userActivityQueryParams: UserActivityParams = {
  type: 'all',
  sortOrder: 'asc',
  page: 1,
  perPage: 10,
};

const userActionsStats = {
  total: 25,
  totalComments: 9,
  totalOtherActions: 16,
};

const defaultProps = {
  caseConnectors: getCaseConnectorsMockResponse(),
  userProfiles: new Map(),
  currentUserProfile: undefined,
  connectors: connectorsMock,
  actionsNavigation: { href: jest.fn(), onClick: jest.fn() },
  getRuleDetailsHref: jest.fn(),
  onRuleDetailsClick: jest.fn(),
  data: basicCase,
  fetchUserActions,
  isLoadingUserActions: false,
  onUpdateField,
  selectedAlertPatterns: ['some-test-pattern'],
  statusActionButton: null,
  updateCase,
  useFetchAlertData: (): [boolean, Record<string, unknown>] => [
    false,
    { 'some-id': { _id: 'some-id' } },
  ],
  alerts: {},
  onShowAlertDetails,
  userActivityQueryParams,
  userActionsStats,
  loadingCommentIds: [],
  commentRefs: { current: {} },
  manageMarkdownEditIds: [],
  handleManageMarkdownEditId: jest.fn(),
  selectedOutlineCommentId: '',
  handleOutlineComment: jest.fn(),
  handleSaveComment: jest.fn(),
  handleDeleteComment: jest.fn(),
  handleManageQuote: jest.fn(),
  loadingAlertData: false,
  manualAlertsData: { 'some-id': { _id: 'some-id' } },
};

jest.mock('../../containers/use_infinite_find_case_user_actions');
jest.mock('../../containers/use_find_case_user_actions');
jest.mock('../../containers/use_update_comment');
jest.mock('./timestamp', () => ({
  UserActionTimestamp: () => <></>,
}));
jest.mock('../../common/lib/kibana');

const useFindCaseUserActionsMock = useFindCaseUserActions as jest.Mock;
const useInfiniteFindCaseUserActionsMock = useInfiniteFindCaseUserActions as jest.Mock;
const useUpdateCommentMock = useUpdateComment as jest.Mock;
const patchComment = jest.fn();

describe(`UserActionsList`, () => {
  let appMockRender: AppMockRenderer;

  beforeEach(() => {
    jest.clearAllMocks();
    useUpdateCommentMock.mockReturnValue({
      isLoadingIds: [],
      patchComment,
    });
    useFindCaseUserActionsMock.mockReturnValue(defaultUseFindCaseUserActions);
    useInfiniteFindCaseUserActionsMock.mockReturnValue(defaultInfiniteUseFindCaseUserActions);

    jest.spyOn(routeData, 'useParams').mockReturnValue({ detailName: 'case-id' });
    appMockRender = createAppMockRenderer();
  });

  it('shows loading skeleton', () => {
    useFindCaseUserActionsMock.mockReturnValue({ isLoading: true });
    appMockRender.render(<UserActionsList {...defaultProps} />);

    expect(screen.getByTestId('user-actions-loading')).toBeInTheDocument();
  });

  it('renders list correctly with isExpandable option', async () => {
    appMockRender.render(<UserActionsList {...defaultProps} isExpandable />);

    await waitFor(() => {
      expect(screen.getByTestId('user-actions-list')).toBeInTheDocument();
      expect(useInfiniteFindCaseUserActionsMock).toHaveBeenCalledWith(
        defaultProps.data.id,
        userActivityQueryParams,
        true
      );
      expect(useFindCaseUserActionsMock).toHaveBeenCalledWith(
        defaultProps.data.id,
        userActivityQueryParams,
        false
      );
    });
  });

  it('renders list correctly with isExpandable=false option', async () => {
    appMockRender.render(<UserActionsList {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByTestId('user-actions-list')).toBeInTheDocument();
      expect(useFindCaseUserActionsMock).toHaveBeenCalledWith(
        defaultProps.data.id,
        userActivityQueryParams,
        true
      );
      expect(useInfiniteFindCaseUserActionsMock).toHaveBeenCalledWith(
        defaultProps.data.id,
        userActivityQueryParams,
        false
      );
    });
  });

  it('renders bottom actions correctly', async () => {
    const userName = 'Username';
    const sample = 'This is an add comment bottom actions';

    const bottomActions = [
      {
        username: <div>{userName}</div>,
        'data-test-subj': 'add-comment',
        timelineAvatar: null,
        className: 'isEdit',
        children: <span>{sample}</span>,
      },
    ];
    appMockRender.render(<UserActionsList {...defaultProps} bottomActions={bottomActions} />);

    await waitFor(() => {
      expect(screen.getByTestId('user-actions-list')).toBeInTheDocument();
      expect(screen.getByTestId('add-comment')).toBeInTheDocument();
    });
  });

  it('renders show more button correctly', async () => {
    useInfiniteFindCaseUserActionsMock.mockReturnValue({ hasNextPage: true, isLoading: false });
    appMockRender.render(<UserActionsList {...defaultProps} isExpandable />);

    await waitFor(() => {
      expect(screen.getByTestId('user-actions-list')).toBeInTheDocument();
      expect(screen.getByTestId('show-more-user-actions')).toBeInTheDocument();
    });
  });

  it('show more button click calls to fetch next user actions', async () => {
    useInfiniteFindCaseUserActionsMock.mockReturnValue({
      hasNextPage: true,
      isLoading: false,
      fetchNextPage: jest.fn(),
    });
    appMockRender.render(<UserActionsList {...defaultProps} isExpandable />);

    await waitFor(() => {
      expect(screen.getByTestId('user-actions-list')).toBeInTheDocument();
      expect(screen.getByTestId('show-more-user-actions')).toBeInTheDocument();
    });

    userEvent.click(screen.getByTestId('show-more-user-actions'));
    expect(defaultInfiniteUseFindCaseUserActions.fetchNextPage).toHaveBeenCalled();
  });
});
