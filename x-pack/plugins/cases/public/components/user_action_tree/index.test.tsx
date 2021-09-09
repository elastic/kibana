/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { mount } from 'enzyme';
import { waitFor } from '@testing-library/react';
// eslint-disable-next-line @kbn/eslint/module_migration
import routeData from 'react-router';

import { getFormMock, useFormMock, useFormDataMock } from '../__mock__/form';
import { useUpdateComment } from '../../containers/use_update_comment';
import {
  basicCase,
  basicPush,
  getUserAction,
  getHostIsolationUserAction,
  hostIsolationComment,
  hostReleaseComment,
} from '../../containers/mock';
import { UserActionTree } from '.';
import { TestProviders } from '../../common/mock';
import { Ecs } from '../../../common';

const fetchUserActions = jest.fn();
const onUpdateField = jest.fn();
const updateCase = jest.fn();
const onShowAlertDetails = jest.fn();

const defaultProps = {
  caseServices: {},
  caseUserActions: [],
  connectors: [],
  getCaseDetailHrefWithCommentId: jest.fn(),
  actionsNavigation: { href: jest.fn(), onClick: jest.fn() },
  getRuleDetailsHref: jest.fn(),
  onRuleDetailsClick: jest.fn(),
  data: basicCase,
  fetchUserActions,
  isLoadingDescription: false,
  isLoadingUserActions: false,
  onUpdateField,
  selectedAlertPatterns: ['some-test-pattern'],
  statusActionButton: null,
  updateCase,
  userCanCrud: true,
  useFetchAlertData: (): [boolean, Record<string, Ecs>] => [
    false,
    { 'some-id': { _id: 'some-id' } },
  ],
  alerts: {},
  onShowAlertDetails,
};
const useUpdateCommentMock = useUpdateComment as jest.Mock;
jest.mock('../../containers/use_update_comment');
jest.mock('./user_action_timestamp');
jest.mock('../../common/lib/kibana');

const patchComment = jest.fn();

describe(`UserActionTree`, () => {
  const sampleData = {
    content: 'what a great comment update',
  };
  beforeEach(() => {
    jest.clearAllMocks();
    useUpdateCommentMock.mockImplementation(() => ({
      isLoadingIds: [],
      patchComment,
    }));
    const formHookMock = getFormMock(sampleData);
    useFormMock.mockImplementation(() => ({ form: formHookMock }));
    useFormDataMock.mockImplementation(() => [{ content: sampleData.content, comment: '' }]);

    jest
      .spyOn(routeData, 'useParams')
      .mockReturnValue({ detailName: 'case-id', subCaseId: 'sub-case-id' });
  });

  it('Loading spinner when user actions loading and displays fullName/username', () => {
    const wrapper = mount(
      <TestProviders>
        <UserActionTree {...{ ...defaultProps, isLoadingUserActions: true }} />
      </TestProviders>
    );
    expect(wrapper.find(`[data-test-subj="user-actions-loading"]`).exists()).toEqual(true);

    expect(wrapper.find(`[data-test-subj="user-action-avatar"]`).first().prop('name')).toEqual(
      defaultProps.data.createdBy.fullName
    );

    expect(
      wrapper.find(`[data-test-subj="description-action"] figcaption strong`).first().text()
    ).toEqual(defaultProps.data.createdBy.username);
  });

  it('Renders service now update line with top and bottom when push is required', async () => {
    const ourActions = [
      getUserAction(['pushed'], 'push-to-service'),
      getUserAction(['comment'], 'update'),
    ];

    const props = {
      ...defaultProps,
      caseServices: {
        '123': {
          ...basicPush,
          firstPushIndex: 0,
          lastPushIndex: 0,
          commentsToUpdate: [`${ourActions[ourActions.length - 1].commentId}`],
          hasDataToPush: true,
        },
      },
      caseUserActions: ourActions,
    };
    const wrapper = mount(
      <TestProviders>
        <UserActionTree {...props} />
      </TestProviders>
    );
    await waitFor(() => {
      expect(wrapper.find(`[data-test-subj="top-footer"]`).exists()).toEqual(true);
      expect(wrapper.find(`[data-test-subj="bottom-footer"]`).exists()).toEqual(true);
    });
  });

  it('Renders service now update line with top only when push is up to date', async () => {
    const ourActions = [getUserAction(['pushed'], 'push-to-service')];
    const props = {
      ...defaultProps,
      caseUserActions: ourActions,
      caseServices: {
        '123': {
          ...basicPush,
          firstPushIndex: 0,
          lastPushIndex: 0,
          commentsToUpdate: [],
          hasDataToPush: false,
        },
      },
    };

    const wrapper = mount(
      <TestProviders>
        <UserActionTree {...props} />
      </TestProviders>
    );
    await waitFor(() => {
      expect(wrapper.find(`[data-test-subj="top-footer"]`).exists()).toEqual(true);
      expect(wrapper.find(`[data-test-subj="bottom-footer"]`).exists()).toEqual(false);
    });
  });
  it('Outlines comment when update move to link is clicked', async () => {
    const ourActions = [getUserAction(['comment'], 'create'), getUserAction(['comment'], 'update')];
    const props = {
      ...defaultProps,
      caseUserActions: ourActions,
    };

    const wrapper = mount(
      <TestProviders>
        <UserActionTree {...props} />
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
        `[data-test-subj="comment-update-action-${ourActions[1].actionId}"] [data-test-subj="move-to-link-${props.data.comments[0].id}"]`
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
    const ourActions = [getUserAction(['comment'], 'create')];
    const props = {
      ...defaultProps,
      caseUserActions: ourActions,
    };

    const wrapper = mount(
      <TestProviders>
        <UserActionTree {...props} />
      </TestProviders>
    );

    wrapper
      .find(
        `[data-test-subj="comment-create-action-${props.data.comments[0].id}"] [data-test-subj="property-actions-ellipses"]`
      )
      .first()
      .simulate('click');
    wrapper
      .find(
        `[data-test-subj="comment-create-action-${props.data.comments[0].id}"] [data-test-subj="property-actions-pencil"]`
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
    const ourActions = [getUserAction(['comment'], 'create')];
    const props = {
      ...defaultProps,
      caseUserActions: ourActions,
    };

    const wrapper = mount(
      <TestProviders>
        <UserActionTree {...props} />
      </TestProviders>
    );

    wrapper
      .find(
        `[data-test-subj="comment-create-action-${props.data.comments[0].id}"] [data-test-subj="property-actions-ellipses"]`
      )
      .first()
      .simulate('click');

    wrapper
      .find(
        `[data-test-subj="comment-create-action-${props.data.comments[0].id}"] [data-test-subj="property-actions-pencil"]`
      )
      .first()
      .simulate('click');

    wrapper
      .find(
        `[data-test-subj="comment-create-action-${props.data.comments[0].id}"] [data-test-subj="user-action-save-markdown"]`
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
        subCaseId: 'sub-case-id',
        commentId: props.data.comments[0].id,
        fetchUserActions,
        updateCase,
        version: props.data.comments[0].version,
      });
    });
  });

  it('calls update description when description markdown is saved', async () => {
    const wrapper = mount(
      <TestProviders>
        <UserActionTree {...defaultProps} />
      </TestProviders>
    );

    wrapper
      .find(`[data-test-subj="description-action"] [data-test-subj="property-actions-ellipses"]`)
      .first()
      .simulate('click');

    wrapper
      .find(`[data-test-subj="description-action"] [data-test-subj="property-actions-pencil"]`)
      .first()
      .simulate('click');

    wrapper
      .find(`[data-test-subj="description-action"] [data-test-subj="user-action-save-markdown"]`)
      .first()
      .simulate('click');

    await waitFor(() => {
      wrapper.update();
      expect(
        wrapper
          .find(
            `[data-test-subj="description-action"] [data-test-subj="user-action-markdown-form"]`
          )
          .exists()
      ).toEqual(false);
      expect(onUpdateField).toBeCalledWith({ key: 'description', value: sampleData.content });
    });
  });

  it('quotes', async () => {
    const commentData = {
      comment: '',
    };
    const setFieldValue = jest.fn();

    const formHookMock = getFormMock(commentData);
    useFormMock.mockImplementation(() => ({ form: { ...formHookMock, setFieldValue } }));

    const props = defaultProps;
    const wrapper = mount(
      <TestProviders>
        <UserActionTree {...props} />
      </TestProviders>
    );

    wrapper
      .find(`[data-test-subj="description-action"] [data-test-subj="property-actions-ellipses"]`)
      .first()
      .simulate('click');

    wrapper
      .find(`[data-test-subj="description-action"] [data-test-subj="property-actions-quote"]`)
      .first()
      .simulate('click');
    await waitFor(() => {
      expect(setFieldValue).toBeCalledWith('comment', `> ${props.data.description} \n`);
    });
  });

  it('Outlines comment when url param is provided', async () => {
    const commentId = 'basic-comment-id';
    jest.spyOn(routeData, 'useParams').mockReturnValue({ commentId });

    const ourActions = [getUserAction(['comment'], 'create')];
    const props = {
      ...defaultProps,
      caseUserActions: ourActions,
    };

    const wrapper = mount(
      <TestProviders>
        <UserActionTree {...props} />
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
          <UserActionTree {...props} />
        </TestProviders>
      );
      await waitFor(() => {
        expect(wrapper.find(`[data-test-subj="endpoint-action"]`).exists()).toBe(true);
      });
    });

    it('shows the correct username', async () => {
      const isolateAction = [getHostIsolationUserAction()];
      const props = {
        ...defaultProps,
        caseUserActions: isolateAction,
        data: { ...defaultProps.data, comments: [hostIsolationComment()] },
      };

      const wrapper = mount(
        <TestProviders>
          <UserActionTree {...props} />
        </TestProviders>
      );
      await waitFor(() => {
        expect(wrapper.find(`[data-test-subj="user-action-avatar"]`).first().prop('name')).toEqual(
          defaultProps.data.createdBy.fullName
        );
      });
    });

    it('shows a lock icon if the action is isolate', async () => {
      const isolateAction = [getHostIsolationUserAction()];
      const props = {
        ...defaultProps,
        caseUserActions: isolateAction,
        data: { ...defaultProps.data, comments: [hostIsolationComment()] },
      };

      const wrapper = mount(
        <TestProviders>
          <UserActionTree {...props} />
        </TestProviders>
      );
      await waitFor(() => {
        expect(
          wrapper.find(`[data-test-subj="endpoint-action-icon"]`).first().prop('iconType')
        ).toBe('lock');
      });
    });
    it('shows a lockOpen icon if the action is unisolate/release', async () => {
      const isolateAction = [getHostIsolationUserAction()];
      const props = {
        ...defaultProps,
        caseUserActions: isolateAction,
        data: { ...defaultProps.data, comments: [hostReleaseComment()] },
      };

      const wrapper = mount(
        <TestProviders>
          <UserActionTree {...props} />
        </TestProviders>
      );
      await waitFor(() => {
        expect(
          wrapper.find(`[data-test-subj="endpoint-action-icon"]`).first().prop('iconType')
        ).toBe('lockOpen');
      });
    });
  });
});
