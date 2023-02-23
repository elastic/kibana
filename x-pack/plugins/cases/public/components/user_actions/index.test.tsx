/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { mount } from 'enzyme';
import { waitFor, screen } from '@testing-library/react';
// eslint-disable-next-line @kbn/eslint/module_migration
import routeData from 'react-router';

import { useUpdateComment } from '../../containers/use_update_comment';
import {
  basicCase,
  getUserAction,
  getHostIsolationUserAction,
  hostIsolationComment,
} from '../../containers/mock';
import { UserActions } from '.';
import type { AppMockRenderer } from '../../common/mock';
import { createAppMockRenderer, TestProviders } from '../../common/mock';
import { Actions } from '../../../common/api';
import { userProfiles, userProfilesMap } from '../../containers/user_profiles/api.mock';
import { connectorsMock, getCaseConnectorsMockResponse } from '../../common/mock/connectors';
import type { UserActivityFilter } from '../user_actions_activity_bar/types';

const fetchUserActions = jest.fn();
const onUpdateField = jest.fn();
const updateCase = jest.fn();
const onShowAlertDetails = jest.fn();

const filterOptions: UserActivityFilter = 'all';

const defaultProps = {
  caseConnectors: getCaseConnectorsMockResponse(),
  caseUserActions: [],
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
  filterOptions,
};

jest.mock('../../containers/use_update_comment');
jest.mock('./timestamp', () => ({
  UserActionTimestamp: () => <></>,
}));
jest.mock('../../common/lib/kibana');

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

    jest.spyOn(routeData, 'useParams').mockReturnValue({ detailName: 'case-id' });
    appMockRender = createAppMockRenderer();
  });

  it('Loading spinner when user actions loading and displays fullName/username', () => {
    appMockRender.render(
      <UserActions
        {...{ ...defaultProps, currentUserProfile: userProfiles[0], isLoadingUserActions: true }}
      />
    );

    expect(screen.getByTestId('user-actions-loading')).toBeInTheDocument();
    expect(screen.getByTestId('case-user-profile-avatar-damaged_raccoon')).toBeInTheDocument();
    expect(screen.getByText('DR')).toBeInTheDocument();
  });

  it('Renders service now update line with top and bottom when push is required', async () => {
    const caseConnectors = getCaseConnectorsMockResponse({ 'push.needsToBePushed': true });

    const ourActions = [
      getUserAction('pushed', 'push_to_service', {
        createdAt: '2023-01-17T09:46:29.813Z',
      }),
    ];

    const props = {
      ...defaultProps,
      caseConnectors,
      caseUserActions: ourActions,
    };

    const wrapper = mount(
      <TestProviders>
        <UserActions {...props} />
      </TestProviders>
    );

    await waitFor(() => {
      expect(wrapper.find(`[data-test-subj="top-footer"]`).exists()).toEqual(true);
      expect(wrapper.find(`[data-test-subj="bottom-footer"]`).exists()).toEqual(true);
    });
  });

  it('Renders service now update line with top only when push is up to date', async () => {
    const ourActions = [
      getUserAction('pushed', 'push_to_service', {
        createdAt: '2023-01-17T09:46:29.813Z',
      }),
    ];

    const props = {
      ...defaultProps,
      caseUserActions: ourActions,
    };

    const wrapper = mount(
      <TestProviders>
        <UserActions {...props} />
      </TestProviders>
    );
    await waitFor(() => {
      expect(wrapper.find(`[data-test-subj="top-footer"]`).exists()).toEqual(true);
      expect(wrapper.find(`[data-test-subj="bottom-footer"]`).exists()).toEqual(false);
    });
  });

  it('Outlines comment when update move to link is clicked', async () => {
    const ourActions = [
      getUserAction('comment', Actions.create),
      getUserAction('comment', Actions.update),
    ];
    const props = {
      ...defaultProps,
      caseUserActions: ourActions,
    };

    const wrapper = mount(
      <TestProviders>
        <UserActions {...props} />
      </TestProviders>
    );
    expect(
      wrapper
        .find(`[data-test-subj="comment-create-action-${props.data.comments[0].id}"]`)
        .first()
        .hasClass('outlined')
    ).toEqual(false);

    wrapper
      .find(
        `[data-test-subj="comment-update-action-${ourActions[1].id}"] [data-test-subj="move-to-link-${props.data.comments[0].id}"]`
      )
      .first()
      .simulate('click');

    await waitFor(() => {
      expect(
        wrapper
          .find(`[data-test-subj="comment-create-action-${props.data.comments[0].id}"]`)
          .first()
          .hasClass('outlined')
      ).toEqual(true);
    });
  });
  it('Switches to markdown when edit is clicked and back to panel when canceled', async () => {
    const ourActions = [getUserAction('comment', Actions.create)];
    const props = {
      ...defaultProps,
      caseUserActions: ourActions,
    };

    const wrapper = mount(
      <TestProviders>
        <UserActions {...props} />
      </TestProviders>
    );

    wrapper
      .find(
        `[data-test-subj="comment-create-action-${props.data.comments[0].id}"] [data-test-subj="property-actions-user-action-ellipses"]`
      )
      .first()
      .simulate('click');
    wrapper
      .find(
        `[data-test-subj="comment-create-action-${props.data.comments[0].id}"] [data-test-subj="property-actions-user-action-pencil"]`
      )
      .first()
      .simulate('click');

    wrapper
      .find(
        `[data-test-subj="comment-create-action-${props.data.comments[0].id}"] [data-test-subj="user-action-cancel-markdown"]`
      )
      .first()
      .simulate('click');

    await waitFor(() => {
      expect(
        wrapper
          .find(
            `[data-test-subj="comment-create-action-${props.data.comments[0].id}"] [data-test-subj="user-action-markdown-form"]`
          )
          .exists()
      ).toEqual(false);
    });
  });

  it('calls update comment when comment markdown is saved', async () => {
    const ourActions = [getUserAction('comment', Actions.create)];
    const props = {
      ...defaultProps,
      caseUserActions: ourActions,
    };

    const wrapper = mount(
      <TestProviders>
        <UserActions {...props} />
      </TestProviders>
    );

    wrapper
      .find(
        `[data-test-subj="comment-create-action-${props.data.comments[0].id}"] [data-test-subj="property-actions-user-action-ellipses"]`
      )
      .first()
      .simulate('click');

    wrapper
      .find(
        `[data-test-subj="comment-create-action-${props.data.comments[0].id}"] [data-test-subj="property-actions-user-action-pencil"]`
      )
      .first()
      .simulate('click');

    wrapper
      .find(`.euiMarkdownEditorTextArea`)
      .first()
      .simulate('change', {
        target: { value: sampleData.content },
      });

    wrapper
      .find(
        `[data-test-subj="comment-create-action-${props.data.comments[0].id}"] button[data-test-subj="user-action-save-markdown"]`
      )
      .first()
      .simulate('click');

    await waitFor(() => {
      wrapper.update();
      expect(
        wrapper
          .find(
            `[data-test-subj="comment-create-action-${props.data.comments[0].id}"] [data-test-subj="user-action-markdown-form"]`
          )
          .exists()
      ).toEqual(false);
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
      caseUserActions: ourActions,
    };

    const wrapper = mount(
      <TestProviders>
        <UserActions {...props} />
      </TestProviders>
    );

    expect(wrapper.find(`.euiMarkdownEditorTextArea`).text()).not.toContain(quoteableText);

    wrapper
      .find(
        `[data-test-subj="comment-create-action-${props.data.comments[0].id}"] [data-test-subj="property-actions-user-action-ellipses"]`
      )
      .first()
      .simulate('click');

    wrapper
      .find(
        `[data-test-subj="comment-create-action-${props.data.comments[0].id}"] [data-test-subj="property-actions-user-action-quote"]`
      )
      .first()
      .simulate('click');

    await waitFor(() => {
      expect(wrapper.find(`[data-test-subj="add-comment"] textarea`).first().text()).toContain(
        quoteableText
      );
    });
  });

  it('does not show add comment markdown when history filter is selected', async () => {
    appMockRender.render(<UserActions {...defaultProps} filterOptions="action" />);

    await waitFor(() => {
      expect(screen.queryByTestId('add-comment')).not.toBeInTheDocument();
    });
  });

  it('Outlines comment when url param is provided', async () => {
    const commentId = 'basic-comment-id';
    jest.spyOn(routeData, 'useParams').mockReturnValue({ commentId });

    const ourActions = [getUserAction('comment', Actions.create)];
    const props = {
      ...defaultProps,
      caseUserActions: ourActions,
    };

    const wrapper = mount(
      <TestProviders>
        <UserActions {...props} />
      </TestProviders>
    );
    await waitFor(() => {
      expect(
        wrapper
          .find(`[data-test-subj="comment-create-action-${commentId}"]`)
          .first()
          .hasClass('outlined')
      ).toEqual(true);
    });
  });

  it('it should persist the draft of new comment while existing old comment is updated', async () => {
    const editedComment = 'it is an edited comment';
    const newComment = 'another cool comment';
    const ourActions = [getUserAction('comment', Actions.create)];
    const props = {
      ...defaultProps,
      caseUserActions: ourActions,
    };
    const wrapper = mount(
      <TestProviders>
        <UserActions {...props} />
      </TestProviders>
    );

    // type new comment in text area
    wrapper
      .find(`[data-test-subj="add-comment"] textarea`)
      .first()
      .simulate('change', { target: { value: newComment } });

    wrapper
      .find(
        `[data-test-subj="comment-create-action-${props.data.comments[0].id}"] [data-test-subj="property-actions-user-action-ellipses"]`
      )
      .first()
      .simulate('click');

    wrapper
      .find(
        `[data-test-subj="comment-create-action-${props.data.comments[0].id}"] [data-test-subj="property-actions-user-action-pencil"]`
      )
      .first()
      .simulate('click');

    wrapper
      .find(`.euiMarkdownEditorTextArea`)
      .first()
      .simulate('change', {
        target: { value: editedComment },
      });

    wrapper
      .find(
        `[data-test-subj="comment-create-action-${props.data.comments[0].id}"] button[data-test-subj="user-action-save-markdown"]`
      )
      .first()
      .simulate('click');

    await waitFor(() => {
      wrapper.update();
      expect(
        wrapper
          .find(
            `[data-test-subj="comment-create-action-${props.data.comments[0].id}"] [data-test-subj="user-action-markdown-form"]`
          )
          .exists()
      ).toEqual(false);
      expect(patchComment).toBeCalledWith({
        commentUpdate: editedComment,
        caseId: 'case-id',
        commentId: props.data.comments[0].id,
        version: props.data.comments[0].version,
      });
    });

    expect(wrapper.find(`[data-test-subj="add-comment"] textarea`).text()).toBe(newComment);
  });

  describe('Host isolation action', () => {
    it('renders in the cases details view', async () => {
      const isolateAction = [getHostIsolationUserAction()];
      const props = {
        ...defaultProps,
        caseUserActions: isolateAction,
        data: { ...defaultProps.data, comments: [...basicCase.comments, hostIsolationComment()] },
      };

      const wrapper = mount(
        <TestProviders>
          <UserActions {...props} />
        </TestProviders>
      );
      await waitFor(() => {
        expect(wrapper.find(`[data-test-subj="endpoint-action"]`).exists()).toBe(true);
      });
    });

    it('shows the correct username', async () => {
      const isolateAction = [
        getHostIsolationUserAction({ createdBy: { profileUid: userProfiles[0].uid } }),
      ];
      const props = {
        ...defaultProps,
        userProfiles: userProfilesMap,
        caseUserActions: isolateAction,
        data: {
          ...defaultProps.data,
          comments: [hostIsolationComment({ createdBy: { profileUid: userProfiles[0].uid } })],
        },
      };

      appMockRender.render(<UserActions {...props} />);

      expect(screen.getByTestId('case-user-profile-avatar-damaged_raccoon')).toBeInTheDocument();
      expect(screen.getByText('DR')).toBeInTheDocument();
      expect(screen.getByText('Damaged Raccoon')).toBeInTheDocument();
    });
  });
});
