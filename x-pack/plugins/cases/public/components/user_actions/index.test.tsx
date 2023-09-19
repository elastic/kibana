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
import { basicCase, caseUserActions, getUserAction } from '../../containers/mock';
import { UserActions } from '.';
import type { AppMockRenderer } from '../../common/mock';
import { createAppMockRenderer } from '../../common/mock';
import { UserActionActions } from '../../../common/types/domain';
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
      mutate: patchComment,
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
    const ourActions = [getUserAction('comment', UserActionActions.create)];

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
    const ourActions = [getUserAction('comment', UserActionActions.create)];

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

      expect(patchComment).toBeCalledWith(
        {
          commentUpdate: sampleData.content,
          caseId: 'case-id',
          commentId: defaultProps.data.comments[0].id,
          version: defaultProps.data.comments[0].version,
        },
        { onSuccess: expect.anything(), onError: expect.anything() }
      );
    });
  });

  it('shows quoted text in last MarkdownEditorTextArea', async () => {
    const quoteableText = `> Solve this fast! \n\n`;
    const ourActions = [getUserAction('comment', UserActionActions.create)];

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
});
