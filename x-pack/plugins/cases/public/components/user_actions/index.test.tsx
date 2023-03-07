/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { waitFor, screen, within, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { waitForEuiPopoverOpen } from '@elastic/eui/lib/test/rtl';
// eslint-disable-next-line @kbn/eslint/module_migration
import routeData from 'react-router';

import { useUpdateComment } from '../../containers/use_update_comment';
import {
  basicCase,
  getHostIsolationUserAction,
  getUserAction,
  hostIsolationComment,
} from '../../containers/mock';
import { UserActions } from '.';
import type { AppMockRenderer } from '../../common/mock';
import { createAppMockRenderer } from '../../common/mock';
import { Actions } from '../../../common/api';
import { userProfiles, userProfilesMap } from '../../containers/user_profiles/api.mock';
import { connectorsMock, getCaseConnectorsMockResponse } from '../../common/mock/connectors';
import type { UserActivityParams } from '../user_actions_activity_bar/types';
import { useFindCaseUserActions } from '../../containers/use_find_case_user_actions';
import {
  defaultInfiniteUseFindCaseUserActions,
  defaultUseFindCaseUserActions,
} from '../case_view/mocks';
import { waitForComponentToUpdate } from '../../common/test_utils';
import { useInfiniteFindCaseUserActions } from '../../containers/use_infinite_find_case_user_actions';

const fetchUserActions = jest.fn();
const onUpdateField = jest.fn();
const updateCase = jest.fn();
const onShowAlertDetails = jest.fn();

const userActionsStats = {
  total: 25,
  totalComments: 9,
  totalOtherActions: 16,
};

const userActivityQueryParams: UserActivityParams = {
  type: 'all',
  sortOrder: 'asc',
  page: 1,
  perPage: 10,
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
};

jest.mock('../../containers/use_infinite_find_case_user_actions');
jest.mock('../../containers/use_find_case_user_actions');
jest.mock('../../containers/use_update_comment');
jest.mock('./timestamp', () => ({
  UserActionTimestamp: () => <></>,
}));
jest.mock('../../common/lib/kibana');

const useInfiniteFindCaseUserActionsMock = useInfiniteFindCaseUserActions as jest.Mock;
const useFindCaseUserActionsMock = useFindCaseUserActions as jest.Mock;
const useUpdateCommentMock = useUpdateComment as jest.Mock;
const patchComment = jest.fn();

describe(`UserActions`, () => {
  const sampleData = {
    content: 'what a great comment update',
  };
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

  it('Loading spinner when user actions loading and displays fullName/username', () => {
    useFindCaseUserActionsMock.mockReturnValue({ isLoading: true });
    useInfiniteFindCaseUserActionsMock.mockReturnValue({ isLoading: true });
    appMockRender.render(
      <UserActions {...{ ...defaultProps, currentUserProfile: userProfiles[0] }} />
    );

    expect(screen.getAllByTestId('user-actions-loading')).toHaveLength(2);
  });

  it('Renders expandable and bottom user action lists', async () => {
    const caseConnectors = getCaseConnectorsMockResponse({ 'push.needsToBePushed': true });
    const ourActions = [
      getUserAction('pushed', 'push_to_service', {
        createdAt: '2023-01-17T09:46:29.813Z',
      }),
    ];

    useInfiniteFindCaseUserActionsMock.mockReturnValue(defaultInfiniteUseFindCaseUserActions);
    useFindCaseUserActionsMock.mockReturnValue({
      ...defaultUseFindCaseUserActions,
      data: { userActions: [...defaultUseFindCaseUserActions.data.userActions, ...ourActions] },
    });

    const props = {
      ...defaultProps,
      caseConnectors,
    };

    appMockRender.render(<UserActions {...props} />);

    await waitForComponentToUpdate();

    await waitFor(() => {
      expect(screen.getByTestId('top-footer')).toBeInTheDocument();
      expect(screen.getByTestId('bottom-footer')).toBeInTheDocument();
      expect(screen.getByTestId('top-footer')).toBeInTheDocument();
      expect(screen.getByTestId('bottom-footer')).toBeInTheDocument();
    });
  });

  it('Renders service now update line with top only when push is up to date', async () => {
    const ourActions = [
      getUserAction('pushed', 'push_to_service', {
        createdAt: '2023-01-17T09:46:29.813Z',
      }),
    ];

    useInfiniteFindCaseUserActionsMock.mockReturnValue(defaultInfiniteUseFindCaseUserActions);
    useFindCaseUserActionsMock.mockReturnValue({
      ...defaultUseFindCaseUserActions,
      data: { userActions: [...defaultUseFindCaseUserActions.data.userActions, ...ourActions] },
    });

    const props = {
      ...defaultProps,
      caseUserActions: ourActions,
    };

    appMockRender.render(<UserActions {...props} />);
    await waitFor(() => {
      expect(screen.getByTestId('top-footer')).toBeInTheDocument();
      expect(screen.queryByTestId('bottom-footer')).not.toBeInTheDocument();
    });
  });

  it('Switches to markdown when edit is clicked and back to panel when canceled', async () => {
    const ourActions = [getUserAction('comment', Actions.create)];
    const props = {
      ...defaultProps,
      caseUserActions: ourActions,
    };

    useInfiniteFindCaseUserActionsMock.mockReturnValue(defaultInfiniteUseFindCaseUserActions);
    useFindCaseUserActionsMock.mockReturnValue({
      ...defaultUseFindCaseUserActions,
      data: { userActions: [...defaultUseFindCaseUserActions.data.userActions, ...ourActions] },
    });

    appMockRender.render(<UserActions {...props} />);

    userEvent.click(
      within(
        screen.getAllByTestId(`comment-create-action-${props.data.comments[0].id}`)[1]
      ).getByTestId('property-actions-user-action-ellipses')
    );

    await waitForEuiPopoverOpen();

    userEvent.click(screen.getByTestId('property-actions-user-action-pencil'));

    userEvent.click(
      within(
        screen.getAllByTestId(`comment-create-action-${props.data.comments[0].id}`)[1]
      ).getByTestId('user-action-cancel-markdown')
    );

    await waitFor(() => {
      expect(
        within(
          screen.getAllByTestId(`comment-create-action-${props.data.comments[0].id}`)[1]
        ).queryByTestId('user-action-markdown-form')
      ).not.toBeInTheDocument();
    });
  });

  it('calls update comment when comment markdown is saved', async () => {
    const ourActions = [getUserAction('comment', Actions.create)];
    const props = {
      ...defaultProps,
      caseUserActions: ourActions,
    };

    useInfiniteFindCaseUserActionsMock.mockReturnValue(defaultInfiniteUseFindCaseUserActions);
    useFindCaseUserActionsMock.mockReturnValue({
      ...defaultUseFindCaseUserActions,
      data: { userActions: ourActions },
    });

    appMockRender.render(<UserActions {...props} />);

    userEvent.click(
      within(
        screen.getAllByTestId(`comment-create-action-${props.data.comments[0].id}`)[1]
      ).getByTestId('property-actions-user-action-ellipses')
    );

    await waitForEuiPopoverOpen();

    userEvent.click(screen.getByTestId('property-actions-user-action-pencil'));

    await waitForComponentToUpdate();

    fireEvent.change(screen.getAllByTestId(`euiMarkdownEditorTextArea`)[0], {
      target: { value: sampleData.content },
    });

    userEvent.click(
      within(
        screen.getAllByTestId(`comment-create-action-${props.data.comments[0].id}`)[1]
      ).getByTestId('user-action-save-markdown')
    );

    await waitFor(() => {
      expect(
        within(
          screen.getAllByTestId(`comment-create-action-${props.data.comments[0].id}`)[1]
        ).queryByTestId('user-action-markdown-form')
      ).not.toBeInTheDocument();

      expect(patchComment).toBeCalledWith({
        commentUpdate: sampleData.content,
        caseId: 'case-id',
        commentId: props.data.comments[0].id,
        version: props.data.comments[0].version,
      });
    });
  });

  it('shows quoted text in last MarkdownEditorTextArea', async () => {
    const quoteableText = `> Solve this fast! \n\n`;

    const ourActions = [getUserAction('comment', Actions.create)];
    const props = {
      ...defaultProps,
    };

    useInfiniteFindCaseUserActionsMock.mockReturnValue(defaultInfiniteUseFindCaseUserActions);
    useFindCaseUserActionsMock.mockReturnValue({
      ...defaultUseFindCaseUserActions,
      data: { userActions: ourActions },
    });

    appMockRender.render(<UserActions {...props} />);

    expect((await screen.findByTestId(`euiMarkdownEditorTextArea`)).textContent).not.toContain(
      quoteableText
    );

    userEvent.click(
      within(
        screen.getAllByTestId(`comment-create-action-${props.data.comments[0].id}`)[1]
      ).getByTestId('property-actions-user-action-ellipses')
    );

    await waitForEuiPopoverOpen();

    userEvent.click(screen.getByTestId('property-actions-user-action-quote'));

    await waitFor(() => {
      expect(screen.getAllByTestId('add-comment')[0].textContent).toContain(quoteableText);
    });
  });

  it('does not show add comment markdown when history filter is selected', async () => {
    appMockRender.render(
      <UserActions
        {...defaultProps}
        userActivityQueryParams={{ ...userActivityQueryParams, type: 'action' }}
      />
    );
    appMockRender.render(
      <UserActions
        {...defaultProps}
        userActivityQueryParams={{ ...userActivityQueryParams, type: 'action' }}
      />
    );

    await waitFor(() => {
      expect(screen.queryByTestId('add-comment')).not.toBeInTheDocument();
    });
  });

  it('it should persist the draft of new comment while existing old comment is updated', async () => {
    const editedComment = 'it is an edited comment';
    const newComment = 'another cool comment';
    const ourActions = [getUserAction('comment', Actions.create)];
    const props = {
      ...defaultProps,
    };
    useInfiniteFindCaseUserActionsMock.mockReturnValue(defaultInfiniteUseFindCaseUserActions);
    useFindCaseUserActionsMock.mockReturnValue({
      ...defaultUseFindCaseUserActions,
      data: { userActions: ourActions },
    });

    appMockRender.render(<UserActions {...props} />);

    userEvent.clear(screen.getByTestId('euiMarkdownEditorTextArea'));
    userEvent.type(screen.getByTestId('euiMarkdownEditorTextArea'), newComment);

    userEvent.click(
      within(
        screen.getAllByTestId(`comment-create-action-${props.data.comments[0].id}`)[1]
      ).getByTestId('property-actions-user-action-ellipses')
    );

    await waitForEuiPopoverOpen();

    userEvent.click(screen.getByTestId('property-actions-user-action-pencil'));

    fireEvent.change(screen.getAllByTestId('euiMarkdownEditorTextArea')[0], {
      target: { value: editedComment },
    });

    userEvent.click(
      within(
        screen.getAllByTestId(`comment-create-action-${props.data.comments[0].id}`)[1]
      ).getByTestId('user-action-save-markdown')
    );

    await waitFor(() => {
      expect(
        within(
          screen.getAllByTestId(`comment-create-action-${props.data.comments[0].id}`)[1]
        ).queryByTestId('user-action-markdown-form')
      ).not.toBeInTheDocument();
    });

    await waitFor(() => {
      expect(screen.getAllByTestId('add-comment')[1].textContent).toContain(newComment);
    });
  });

  describe('Host isolation action', () => {
    it('renders in the cases details view', async () => {
      const isolateAction = [getHostIsolationUserAction()];
      const props = {
        ...defaultProps,
        data: { ...defaultProps.data, comments: [...basicCase.comments, hostIsolationComment()] },
      };

      useInfiniteFindCaseUserActionsMock.mockReturnValue(defaultInfiniteUseFindCaseUserActions);
      useFindCaseUserActionsMock.mockReturnValue({
        ...defaultUseFindCaseUserActions,
        data: { userActions: isolateAction },
      });

      appMockRender.render(<UserActions {...props} />);
      await waitFor(() => {
        expect(screen.getByTestId('endpoint-action')).toBeInTheDocument();
      });
    });

    it('shows the correct username', async () => {
      const isolateAction = [
        getHostIsolationUserAction({ createdBy: { profileUid: userProfiles[0].uid } }),
      ];
      const props = {
        ...defaultProps,
        userProfiles: userProfilesMap,
        data: {
          ...defaultProps.data,
          comments: [hostIsolationComment({ createdBy: { profileUid: userProfiles[0].uid } })],
        },
      };

      useInfiniteFindCaseUserActionsMock.mockReturnValue(defaultInfiniteUseFindCaseUserActions);
      useFindCaseUserActionsMock.mockReturnValue({
        ...defaultUseFindCaseUserActions,
        data: { userActions: isolateAction },
      });

      appMockRender.render(<UserActions {...props} />);

      expect(screen.getByTestId('case-user-profile-avatar-damaged_raccoon')).toBeInTheDocument();
      expect(screen.getByText('DR')).toBeInTheDocument();
      expect(screen.getByText('Damaged Raccoon')).toBeInTheDocument();
    });
  });
});
