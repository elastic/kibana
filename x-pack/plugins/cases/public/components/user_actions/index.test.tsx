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
  caseUserActions,
  getHostIsolationUserAction,
  getUserAction,
  hostIsolationComment,
} from '../../containers/mock';
import { UserActions } from '.';
import type { AppMockRenderer } from '../../common/mock';
import { createAppMockRenderer } from '../../common/mock';
import { Actions } from '../../../common/api';
import { userProfiles, userProfilesMap } from '../../containers/user_profiles/api.mock';
import { getCaseConnectorsMockResponse } from '../../common/mock/connectors';
import type { UserActivityParams } from '../user_actions_activity_bar/types';
import { useFindCaseUserActions } from '../../containers/use_find_case_user_actions';
import {
  defaultInfiniteUseFindCaseUserActions,
  defaultUseFindCaseUserActions,
} from '../case_view/mocks';
import { waitForComponentToUpdate } from '../../common/test_utils';
import { useInfiniteFindCaseUserActions } from '../../containers/use_infinite_find_case_user_actions';
import { getMockBuilderArgs } from './mock';

const onUpdateField = jest.fn();

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

const builderArgs = getMockBuilderArgs();

const defaultProps = {
  caseUserActions,
  ...builderArgs,
  caseConnectors: getCaseConnectorsMockResponse(),
  data: basicCase,
  manualAlertsData: { 'some-id': { _id: 'some-id' } },
  onUpdateField,
  userActivityQueryParams,
  userActionsStats,
  statusActionButton: null,
  useFetchAlertData: (): [boolean, Record<string, unknown>] => [
    false,
    { 'some-id': { _id: 'some-id' } },
  ],
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

  it('Renders service now update line with top and bottom when push is required', async () => {
    const caseConnectors = getCaseConnectorsMockResponse({ 'push.needsToBePushed': true });
    const ourActions = [
      getUserAction('pushed', 'push_to_service', {
        createdAt: '2023-01-17T09:46:29.813Z',
      }),
    ];

    useFindCaseUserActionsMock.mockReturnValue({
      ...defaultUseFindCaseUserActions,
      data: { userActions: ourActions },
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
    });
  });

  it('Renders service now update line with top only when push is up to date', async () => {
    const ourActions = [
      getUserAction('pushed', 'push_to_service', {
        createdAt: '2023-01-17T09:46:29.813Z',
      }),
    ];

    useFindCaseUserActionsMock.mockReturnValue({
      ...defaultUseFindCaseUserActions,
      data: { userActions: ourActions },
    });

    appMockRender.render(<UserActions {...defaultProps} />);
    await waitFor(() => {
      expect(screen.getByTestId('top-footer')).toBeInTheDocument();
      expect(screen.queryByTestId('bottom-footer')).not.toBeInTheDocument();
    });
  });

  it('Switches to markdown when edit is clicked and back to panel when canceled', async () => {
    const ourActions = [getUserAction('comment', Actions.create)];

    useFindCaseUserActionsMock.mockReturnValue({
      ...defaultUseFindCaseUserActions,
      data: { userActions: ourActions },
    });

    appMockRender.render(<UserActions {...defaultProps} />);

    userEvent.click(
      within(
        screen.getAllByTestId(`comment-create-action-${defaultProps.data.comments[0].id}`)[1]
      ).getByTestId('property-actions-user-action-ellipses')
    );

    await waitForEuiPopoverOpen();

    userEvent.click(screen.getByTestId('property-actions-user-action-pencil'));

    userEvent.click(
      within(
        screen.getAllByTestId(`comment-create-action-${defaultProps.data.comments[0].id}`)[1]
      ).getByTestId('editable-cancel-markdown')
    );

    await waitFor(() => {
      expect(
        within(
          screen.getAllByTestId(`comment-create-action-${defaultProps.data.comments[0].id}`)[1]
        ).queryByTestId('editable-markdown-form')
      ).not.toBeInTheDocument();
    });
  });

  it('calls update comment when comment markdown is saved', async () => {
    const ourActions = [getUserAction('comment', Actions.create)];

    useFindCaseUserActionsMock.mockReturnValue({
      ...defaultUseFindCaseUserActions,
      data: { userActions: ourActions },
    });

    appMockRender.render(<UserActions {...defaultProps} />);

    userEvent.click(
      within(
        screen.getAllByTestId(`comment-create-action-${defaultProps.data.comments[0].id}`)[1]
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
        screen.getAllByTestId(`comment-create-action-${defaultProps.data.comments[0].id}`)[1]
      ).getByTestId('editable-save-markdown')
    );

    await waitFor(() => {
      expect(
        within(
          screen.getAllByTestId(`comment-create-action-${defaultProps.data.comments[0].id}`)[1]
        ).queryByTestId('editable-markdown-form')
      ).not.toBeInTheDocument();

      expect(patchComment).toBeCalledWith({
        commentUpdate: sampleData.content,
        caseId: 'case-id',
        commentId: defaultProps.data.comments[0].id,
        version: defaultProps.data.comments[0].version,
      });
    });
  });

  it('shows quoted text in last MarkdownEditorTextArea', async () => {
    const quoteableText = `> Solve this fast! \n\n`;
    const ourActions = [getUserAction('comment', Actions.create)];

    useFindCaseUserActionsMock.mockReturnValue({
      ...defaultUseFindCaseUserActions,
      data: { userActions: ourActions },
    });

    appMockRender.render(<UserActions {...defaultProps} />);

    expect((await screen.findByTestId(`euiMarkdownEditorTextArea`)).textContent).not.toContain(
      quoteableText
    );

    userEvent.click(
      within(
        screen.getAllByTestId(`comment-create-action-${defaultProps.data.comments[0].id}`)[1]
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

    await waitFor(() => {
      expect(screen.queryByTestId('add-comment')).not.toBeInTheDocument();
    });
  });

  it('it should persist the draft of new comment while existing old comment is updated', async () => {
    const editedComment = 'it is an edited comment';
    const newComment = 'another cool comment';
    const ourActions = [getUserAction('comment', Actions.create)];

    useFindCaseUserActionsMock.mockReturnValue({
      ...defaultUseFindCaseUserActions,
      data: { userActions: ourActions },
    });

    appMockRender.render(<UserActions {...defaultProps} />);

    userEvent.clear(screen.getByTestId('euiMarkdownEditorTextArea'));
    userEvent.type(screen.getByTestId('euiMarkdownEditorTextArea'), newComment);

    userEvent.click(
      within(
        screen.getAllByTestId(`comment-create-action-${defaultProps.data.comments[0].id}`)[1]
      ).getByTestId('property-actions-user-action-ellipses')
    );

    await waitForEuiPopoverOpen();

    userEvent.click(screen.getByTestId('property-actions-user-action-pencil'));

    fireEvent.change(screen.getAllByTestId('euiMarkdownEditorTextArea')[0], {
      target: { value: editedComment },
    });

    userEvent.click(
      within(
        screen.getAllByTestId(`comment-create-action-${defaultProps.data.comments[0].id}`)[1]
      ).getByTestId('editable-save-markdown')
    );

    await waitFor(() => {
      expect(
        within(
          screen.getAllByTestId(`comment-create-action-${defaultProps.data.comments[0].id}`)[1]
        ).queryByTestId('editable-markdown-form')
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

      useFindCaseUserActionsMock.mockReturnValue({
        ...defaultUseFindCaseUserActions,
        data: { userActions: isolateAction },
      });

      appMockRender.render(<UserActions {...props} />);

      expect(
        screen.getAllByTestId('case-user-profile-avatar-damaged_raccoon')[0]
      ).toBeInTheDocument();
      expect(screen.getAllByText('DR')[0]).toBeInTheDocument();
      expect(screen.getAllByText('Damaged Raccoon')[0]).toBeInTheDocument();
    });
  });

  describe('pagination', () => {
    beforeEach(() => {
      jest.clearAllMocks();
    });

    it('Loading spinner when user actions loading', () => {
      useFindCaseUserActionsMock.mockReturnValue({ isLoading: true });
      useInfiniteFindCaseUserActionsMock.mockReturnValue({ isLoading: true });
      appMockRender.render(
        <UserActions {...{ ...defaultProps, currentUserProfile: userProfiles[0] }} />
      );

      expect(screen.getByTestId('user-actions-loading')).toBeInTheDocument();
    });

    it('renders two user actions list when user actions are more than 10', () => {
      appMockRender.render(<UserActions {...defaultProps} />);

      expect(screen.getAllByTestId('user-actions-list')).toHaveLength(2);
    });

    it('renders only one user actions list when last page is 0', async () => {
      useFindCaseUserActionsMock.mockReturnValue({
        ...defaultUseFindCaseUserActions,
        data: { userActions: [] },
      });
      const props = {
        ...defaultProps,
        userActionsStats: {
          total: 0,
          totalComments: 0,
          totalOtherActions: 0,
        },
      };

      appMockRender.render(<UserActions {...props} />);

      await waitForComponentToUpdate();

      expect(screen.getAllByTestId('user-actions-list')).toHaveLength(1);
    });

    it('renders only one user actions list when last page is 1', async () => {
      useFindCaseUserActionsMock.mockReturnValue({
        ...defaultUseFindCaseUserActions,
        data: { userActions: [] },
      });
      const props = {
        ...defaultProps,
        userActionsStats: {
          total: 1,
          totalComments: 0,
          totalOtherActions: 1,
        },
      };

      appMockRender.render(<UserActions {...props} />);

      await waitForComponentToUpdate();

      expect(screen.getAllByTestId('user-actions-list')).toHaveLength(1);
    });

    it('renders only one action list when user actions are less than or equal to 10', async () => {
      useFindCaseUserActionsMock.mockReturnValue({
        ...defaultUseFindCaseUserActions,
        data: { userActions: [] },
      });
      const props = {
        ...defaultProps,
        userActionsStats: {
          total: 10,
          totalComments: 6,
          totalOtherActions: 4,
        },
      };

      appMockRender.render(<UserActions {...props} />);

      await waitForComponentToUpdate();

      expect(screen.getAllByTestId('user-actions-list')).toHaveLength(1);
    });

    it('shows more button visible when hasNext page is true', async () => {
      useInfiniteFindCaseUserActionsMock.mockReturnValue({
        ...defaultInfiniteUseFindCaseUserActions,
        hasNextPage: true,
      });
      const props = {
        ...defaultProps,
        userActionsStats: {
          total: 25,
          totalComments: 10,
          totalOtherActions: 15,
        },
      };

      appMockRender.render(<UserActions {...props} />);

      await waitForComponentToUpdate();

      expect(screen.getAllByTestId('user-actions-list')).toHaveLength(2);
      expect(screen.getByTestId('cases-show-more-user-actions')).toBeInTheDocument();
    });

    it('call fetchNextPage on showMore button click', async () => {
      useInfiniteFindCaseUserActionsMock.mockReturnValue({
        ...defaultInfiniteUseFindCaseUserActions,
        hasNextPage: true,
      });
      const props = {
        ...defaultProps,
        userActionsStats: {
          total: 25,
          totalComments: 10,
          totalOtherActions: 15,
        },
      };

      appMockRender.render(<UserActions {...props} />);

      await waitForComponentToUpdate();

      expect(screen.getAllByTestId('user-actions-list')).toHaveLength(2);

      const showMore = screen.getByTestId('cases-show-more-user-actions');

      expect(showMore).toBeInTheDocument();

      userEvent.click(showMore);

      await waitFor(() => {
        expect(defaultInfiniteUseFindCaseUserActions.fetchNextPage).toHaveBeenCalled();
      });
    });

    it('shows more button visible 21st user action added', async () => {
      const mockUserActions = [
        ...caseUserActions,
        getUserAction('comment', Actions.create),
        getUserAction('comment', Actions.update),
        getUserAction('comment', Actions.create),
        getUserAction('comment', Actions.update),
        getUserAction('comment', Actions.create),
        getUserAction('comment', Actions.update),
        getUserAction('comment', Actions.create),
      ];
      useInfiniteFindCaseUserActionsMock.mockReturnValue({
        ...defaultInfiniteUseFindCaseUserActions,
        data: {
          pages: [
            {
              total: 20,
              page: 1,
              perPage: 10,
              userActions: mockUserActions,
            },
          ],
        },
      });
      useFindCaseUserActionsMock.mockReturnValue({
        ...defaultUseFindCaseUserActions,
        data: {
          total: 20,
          page: 2,
          perPage: 10,
          userActions: mockUserActions,
        },
      });
      const props = {
        ...defaultProps,
        userActionsStats: {
          total: 20,
          totalComments: 10,
          totalOtherActions: 10,
        },
      };

      const { rerender } = appMockRender.render(<UserActions {...props} />);

      await waitForComponentToUpdate();

      expect(screen.getAllByTestId('user-actions-list')).toHaveLength(2);
      expect(screen.queryByTestId('cases-show-more-user-actions')).not.toBeInTheDocument();

      useInfiniteFindCaseUserActionsMock.mockReturnValue({
        ...defaultInfiniteUseFindCaseUserActions,
        data: {
          pages: [
            {
              total: 21,
              page: 1,
              perPage: 10,
              userActions: mockUserActions,
            },
            {
              total: 21,
              page: 2,
              perPage: 10,
              userActions: [getUserAction('comment', Actions.create)],
            },
          ],
        },
        hasNextPage: true,
      });
      useFindCaseUserActionsMock.mockReturnValue({
        ...defaultUseFindCaseUserActions,
        data: {
          total: 21,
          page: 2,
          perPage: 10,
          userActions: mockUserActions,
        },
      });

      const newProps = {
        ...props,
        userActionsStats: {
          total: 21,
          totalComments: 11,
          totalOtherActions: 10,
        },
      };

      rerender(<UserActions {...newProps} />);

      await waitForComponentToUpdate();

      expect(screen.getAllByTestId('user-actions-list')).toHaveLength(2);

      const firstUserActionsList = screen.getAllByTestId('user-actions-list')[0];

      expect(firstUserActionsList.getElementsByTagName('li')).toHaveLength(11);

      expect(screen.getByTestId('cases-show-more-user-actions')).toBeInTheDocument();
    });
  });
});
