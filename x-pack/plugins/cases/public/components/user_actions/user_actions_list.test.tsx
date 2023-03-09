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

import { basicCase, getUserAction } from '../../containers/mock';
import { UserActionsList } from './user_actions_list';
import type { AppMockRenderer } from '../../common/mock';
import { createAppMockRenderer } from '../../common/mock';
import { Actions } from '../../../common/api';
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
jest.mock('../../common/lib/kibana');

const useFindCaseUserActionsMock = useFindCaseUserActions as jest.Mock;
const useInfiniteFindCaseUserActionsMock = useInfiniteFindCaseUserActions as jest.Mock;

describe(`UserActionsList`, () => {
  let appMockRender: AppMockRenderer;

  beforeEach(() => {
    jest.clearAllMocks();
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

  it('Outlines comment when url param is provided', async () => {
    const commentId = 'basic-comment-id';
    jest.spyOn(routeData, 'useParams').mockReturnValue({ commentId });

    const ourActions = [getUserAction('comment', Actions.create)];

    useInfiniteFindCaseUserActionsMock.mockReturnValue(defaultInfiniteUseFindCaseUserActions);
    useFindCaseUserActionsMock.mockReturnValue({
      isLoading: false,
      data: { ...defaultUseFindCaseUserActions.data, userActions: ourActions },
    });

    appMockRender.render(<UserActionsList {...defaultProps} />);

    expect(
      await screen.findAllByTestId(`comment-create-action-${commentId}`)
    )[0]?.classList.contains('outlined');
  });

  it('Outlines comment when update move to link is clicked', async () => {
    const ourActions = [
      getUserAction('comment', Actions.create),
      getUserAction('comment', Actions.update),
    ];

    useInfiniteFindCaseUserActionsMock.mockReturnValue(defaultInfiniteUseFindCaseUserActions);
    useFindCaseUserActionsMock.mockReturnValue({
      ...defaultUseFindCaseUserActions,
      data: { userActions: ourActions },
    });

    appMockRender.render(<UserActionsList {...defaultProps} />);
    expect(
      screen
        .queryAllByTestId(`comment-create-action-${defaultProps.data.comments[0].id}`)[0]
        ?.classList.contains('outlined')
    ).toBe(false);

    expect(
      screen
        .queryAllByTestId(`comment-create-action-${defaultProps.data.comments[0].id}`)[0]
        ?.classList.contains('outlined')
    ).toBe(false);

    userEvent.click(screen.getByTestId(`comment-update-action-${ourActions[1].id}`));

    expect(
      await screen.findAllByTestId(`comment-create-action-${defaultProps.data.comments[0].id}`)
    )[0]?.classList.contains('outlined');
  });
});
