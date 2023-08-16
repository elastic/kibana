/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiCommentList } from '@elastic/eui';
import type { RenderResult } from '@testing-library/react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { waitForEuiPopoverOpen } from '@elastic/eui/lib/test/rtl';

import { UserActionActions } from '../../../../common/types/domain';
import {
  alertComment,
  basicCase,
  externalReferenceAttachment,
  getAlertUserAction,
  getExternalReferenceAttachment,
  getExternalReferenceUserAction,
  getHostIsolationUserAction,
  getMultipleAlertsUserAction,
  getPersistableStateAttachment,
  getPersistableStateUserAction,
  getUserAction,
  hostIsolationComment,
  persistableStateAttachment,
} from '../../../containers/mock';
import type { AppMockRenderer } from '../../../common/mock';
import { createAppMockRenderer, TestProviders } from '../../../common/mock';
import { createCommentUserActionBuilder } from './comment';
import { getMockBuilderArgs } from '../mock';
import { useCaseViewNavigation, useCaseViewParams } from '../../../common/navigation';
import { ExternalReferenceAttachmentTypeRegistry } from '../../../client/attachment_framework/external_reference_registry';
import { PersistableStateAttachmentTypeRegistry } from '../../../client/attachment_framework/persistable_state_registry';
import { userProfiles } from '../../../containers/user_profiles/api.mock';
import { AttachmentActionType } from '../../../client/attachment_framework/types';

jest.mock('../../../common/lib/kibana');
jest.mock('../../../common/navigation/hooks');

const useCaseViewParamsMock = useCaseViewParams as jest.Mock;
const useCaseViewNavigationMock = useCaseViewNavigation as jest.Mock;
const navigateToCaseView = jest.fn();

describe('createCommentUserActionBuilder', () => {
  const builderArgs = getMockBuilderArgs();

  beforeEach(() => {
    jest.clearAllMocks();
    useCaseViewNavigationMock.mockReturnValue({ navigateToCaseView });
  });

  describe('edits', () => {
    it('renders correctly when editing a comment', async () => {
      const userAction = getUserAction('comment', UserActionActions.update);
      const builder = createCommentUserActionBuilder({
        ...builderArgs,
        userAction,
      });

      const createdUserAction = builder.build();
      render(
        <TestProviders>
          <EuiCommentList comments={createdUserAction} />
        </TestProviders>
      );

      expect(screen.getByText('edited comment')).toBeInTheDocument();
    });
  });

  describe('deletions', () => {
    it('renders correctly when deleting a comment', async () => {
      const userAction = getUserAction('comment', UserActionActions.delete);
      const builder = createCommentUserActionBuilder({
        ...builderArgs,
        userAction,
      });

      const createdUserAction = builder.build();
      render(
        <TestProviders>
          <EuiCommentList comments={createdUserAction} />
        </TestProviders>
      );

      expect(screen.getByText('removed comment')).toBeInTheDocument();
    });

    it('renders correctly when deleting a single alert', async () => {
      const userAction = getAlertUserAction({ action: UserActionActions.delete });
      const builder = createCommentUserActionBuilder({
        ...builderArgs,
        userAction,
      });

      const createdUserAction = builder.build();
      render(
        <TestProviders>
          <EuiCommentList comments={createdUserAction} />
        </TestProviders>
      );

      expect(screen.getByText('removed one alert')).toBeInTheDocument();
    });

    it('renders correctly when deleting multiple alerts', async () => {
      const userAction = getMultipleAlertsUserAction({ action: UserActionActions.delete });
      const builder = createCommentUserActionBuilder({
        ...builderArgs,
        userAction,
      });

      const createdUserAction = builder.build();
      render(
        <TestProviders>
          <EuiCommentList comments={createdUserAction} />
        </TestProviders>
      );

      expect(screen.getByText('removed 2 alerts')).toBeInTheDocument();
    });

    it('renders correctly when deleting an external reference attachment', async () => {
      const userAction = getExternalReferenceUserAction({ action: UserActionActions.delete });
      const builder = createCommentUserActionBuilder({
        ...builderArgs,
        userAction,
      });

      const createdUserAction = builder.build();
      render(
        <TestProviders>
          <EuiCommentList comments={createdUserAction} />
        </TestProviders>
      );

      expect(screen.getByText('removed attachment')).toBeInTheDocument();
    });

    it('renders correctly when deleting an external reference attachment with getAttachmentRemovalObject defined', async () => {
      const getAttachmentRemovalObject = jest.fn().mockReturnValue({
        event: 'removed my own attachment',
      });

      const externalReferenceAttachmentTypeRegistry = new ExternalReferenceAttachmentTypeRegistry();
      const attachment = getExternalReferenceAttachment();
      externalReferenceAttachmentTypeRegistry.register({
        ...attachment,
        getAttachmentRemovalObject,
      });

      const userAction = getExternalReferenceUserAction({ action: UserActionActions.delete });
      const builder = createCommentUserActionBuilder({
        ...builderArgs,
        externalReferenceAttachmentTypeRegistry,
        userAction,
        caseData: {
          ...builderArgs.caseData,
          comments: [externalReferenceAttachment],
        },
      });

      const createdUserAction = builder.build();
      render(
        <TestProviders>
          <EuiCommentList comments={createdUserAction} />
        </TestProviders>
      );

      expect(screen.getByText('removed my own attachment')).toBeInTheDocument();
      expect(getAttachmentRemovalObject).toBeCalledWith({
        caseData: {
          id: 'basic-case-id',
          title: 'Another horrible breach!!',
        },
        externalReferenceId: 'my-id',
        externalReferenceMetadata: null,
      });
    });

    it('renders correctly when deleting an external reference attachment without getAttachmentRemovalObject defined', async () => {
      const externalReferenceAttachmentTypeRegistry = new ExternalReferenceAttachmentTypeRegistry();
      const attachment = getExternalReferenceAttachment();
      externalReferenceAttachmentTypeRegistry.register(attachment);

      const userAction = getExternalReferenceUserAction({ action: UserActionActions.delete });
      const builder = createCommentUserActionBuilder({
        ...builderArgs,
        externalReferenceAttachmentTypeRegistry,
        userAction,
      });

      const createdUserAction = builder.build();
      render(
        <TestProviders>
          <EuiCommentList comments={createdUserAction} />
        </TestProviders>
      );

      expect(screen.getByText('removed attachment')).toBeInTheDocument();
    });

    it('renders correctly when deleting a persistable state attachment', async () => {
      const userAction = getPersistableStateUserAction({ action: UserActionActions.delete });
      const builder = createCommentUserActionBuilder({
        ...builderArgs,
        userAction,
      });

      const createdUserAction = builder.build();
      render(
        <TestProviders>
          <EuiCommentList comments={createdUserAction} />
        </TestProviders>
      );

      expect(screen.getByText('removed attachment')).toBeInTheDocument();
    });

    it('renders correctly when deleting a persistable state attachment with getAttachmentRemovalObject defined', async () => {
      const getAttachmentRemovalObject = jest.fn().mockReturnValue({
        event: 'removed my own attachment',
      });

      const persistableStateAttachmentTypeRegistry = new PersistableStateAttachmentTypeRegistry();
      const attachment = getPersistableStateAttachment();
      persistableStateAttachmentTypeRegistry.register({
        ...attachment,
        getAttachmentRemovalObject,
      });

      const userAction = getPersistableStateUserAction({ action: UserActionActions.delete });
      const builder = createCommentUserActionBuilder({
        ...builderArgs,
        persistableStateAttachmentTypeRegistry,
        userAction,
        caseData: {
          ...builderArgs.caseData,
          comments: [persistableStateAttachment],
        },
      });

      const createdUserAction = builder.build();
      render(
        <TestProviders>
          <EuiCommentList comments={createdUserAction} />
        </TestProviders>
      );

      expect(screen.getByText('removed my own attachment')).toBeInTheDocument();
      expect(getAttachmentRemovalObject).toBeCalledWith({
        caseData: {
          id: 'basic-case-id',
          title: 'Another horrible breach!!',
        },
        persistableStateAttachmentTypeId: '.test',
        persistableStateAttachmentState: {
          test_foo: 'foo',
        },
      });
    });

    it('renders correctly when deleting a persistable state attachment without getAttachmentRemovalObject defined', async () => {
      const persistableStateAttachmentTypeRegistry = new PersistableStateAttachmentTypeRegistry();
      const attachment = getPersistableStateAttachment();
      persistableStateAttachmentTypeRegistry.register(attachment);

      const userAction = getPersistableStateUserAction({ action: UserActionActions.delete });
      const builder = createCommentUserActionBuilder({
        ...builderArgs,
        persistableStateAttachmentTypeRegistry,
        userAction,
      });

      const createdUserAction = builder.build();
      render(
        <TestProviders>
          <EuiCommentList comments={createdUserAction} />
        </TestProviders>
      );

      expect(screen.getByText('removed attachment')).toBeInTheDocument();
    });
  });

  describe('user comments', () => {
    it('renders correctly a user comment', async () => {
      const userAction = getUserAction('comment', UserActionActions.create, {
        commentId: basicCase.comments[0].id,
      });

      const builder = createCommentUserActionBuilder({
        ...builderArgs,
        userAction,
      });

      const createdUserAction = builder.build();
      render(
        <TestProviders>
          <EuiCommentList comments={createdUserAction} />
        </TestProviders>
      );

      expect(screen.getByText('Solve this fast!')).toBeInTheDocument();
    });

    it('deletes a user comment correctly', async () => {
      const userAction = getUserAction('comment', UserActionActions.create, {
        commentId: basicCase.comments[0].id,
      });

      const builder = createCommentUserActionBuilder({
        ...builderArgs,
        userAction,
      });

      const createdUserAction = builder.build();
      const result = render(
        <TestProviders>
          <EuiCommentList comments={createdUserAction} />
        </TestProviders>
      );

      expect(screen.getByText('Solve this fast!')).toBeInTheDocument();

      await deleteAttachment(result, 'trash', 'Delete');

      await waitFor(() => {
        expect(builderArgs.handleDeleteComment).toHaveBeenCalledWith(
          'basic-comment-id',
          'Deleted comment'
        );
      });
    });

    it('edits a user comment correctly', async () => {
      const userAction = getUserAction('comment', UserActionActions.create, {
        commentId: basicCase.comments[0].id,
      });

      const builder = createCommentUserActionBuilder({
        ...builderArgs,
        userAction,
      });

      const createdUserAction = builder.build();
      render(
        <TestProviders>
          <EuiCommentList comments={createdUserAction} />
        </TestProviders>
      );

      expect(screen.getByText('Solve this fast!')).toBeInTheDocument();
      expect(screen.getByTestId('property-actions-user-action')).toBeInTheDocument();

      userEvent.click(screen.getByTestId('property-actions-user-action-ellipses'));
      await waitForEuiPopoverOpen();

      expect(screen.queryByTestId('property-actions-user-action-pencil')).toBeInTheDocument();
      userEvent.click(screen.getByTestId('property-actions-user-action-pencil'));

      await waitFor(() => {
        expect(builderArgs.handleManageMarkdownEditId).toHaveBeenCalledWith('basic-comment-id');
      });
    });

    it('quotes a user comment correctly', async () => {
      const userAction = getUserAction('comment', UserActionActions.create, {
        commentId: basicCase.comments[0].id,
      });

      const builder = createCommentUserActionBuilder({
        ...builderArgs,
        userAction,
      });

      const createdUserAction = builder.build();
      render(
        <TestProviders>
          <EuiCommentList comments={createdUserAction} />
        </TestProviders>
      );

      expect(screen.getByText('Solve this fast!')).toBeInTheDocument();
      expect(screen.getByTestId('property-actions-user-action')).toBeInTheDocument();

      userEvent.click(screen.getByTestId('property-actions-user-action-ellipses'));
      await waitForEuiPopoverOpen();

      expect(screen.queryByTestId('property-actions-user-action-quote')).toBeInTheDocument();
      userEvent.click(screen.getByTestId('property-actions-user-action-quote'));

      await waitFor(() => {
        expect(builderArgs.handleManageQuote).toHaveBeenCalledWith('Solve this fast!');
      });
    });
  });

  describe('Single alert', () => {
    it('renders correctly a single alert', async () => {
      const userAction = getAlertUserAction();

      const builder = createCommentUserActionBuilder({
        ...builderArgs,
        caseData: {
          ...builderArgs.caseData,
          comments: [alertComment],
        },
        userAction,
      });

      const createdUserAction = builder.build();
      render(
        <TestProviders>
          <EuiCommentList comments={createdUserAction} />
        </TestProviders>
      );

      expect(screen.getByTestId('single-alert-user-action-alert-action-id')).toHaveTextContent(
        'added an alert from Awesome rule'
      );
    });

    it('deletes a single alert correctly', async () => {
      const userAction = getAlertUserAction();

      const builder = createCommentUserActionBuilder({
        ...builderArgs,
        caseData: {
          ...builderArgs.caseData,
          comments: [alertComment],
        },
        userAction,
      });

      const createdUserAction = builder.build();
      const res = render(
        <TestProviders>
          <EuiCommentList comments={createdUserAction} />
        </TestProviders>
      );

      expect(res.getByTestId('single-alert-user-action-alert-action-id')).toHaveTextContent(
        'added an alert from Awesome rule'
      );

      await deleteAttachment(res, 'minusInCircle', 'Remove');

      await waitFor(() => {
        expect(builderArgs.handleDeleteComment).toHaveBeenCalledWith(
          'alert-comment-id',
          'Deleted one alert'
        );
      });
    });

    it('views an alert correctly', async () => {
      const userAction = getAlertUserAction();

      const builder = createCommentUserActionBuilder({
        ...builderArgs,
        caseData: {
          ...builderArgs.caseData,
          comments: [alertComment],
        },
        userAction,
      });

      const createdUserAction = builder.build();
      render(
        <TestProviders>
          <EuiCommentList comments={createdUserAction} />
        </TestProviders>
      );

      expect(screen.getByTestId('comment-action-show-alert-alert-action-id')).toBeInTheDocument();
      userEvent.click(screen.getByTestId('comment-action-show-alert-alert-action-id'));

      await waitFor(() => {
        expect(builderArgs.onShowAlertDetails).toHaveBeenCalledWith('alert-id-1', 'alert-index-1');
      });
    });
  });

  describe('Multiple alerts', () => {
    let appMockRender: AppMockRenderer;

    beforeEach(() => {
      appMockRender = createAppMockRenderer();
    });

    it('renders correctly multiple alerts with a link to the alerts table', async () => {
      useCaseViewParamsMock.mockReturnValue({ detailName: '1234' });
      const userAction = getAlertUserAction();

      const builder = createCommentUserActionBuilder({
        ...builderArgs,
        caseData: {
          ...builderArgs.caseData,
          comments: [
            {
              ...alertComment,
              alertId: ['alert-id-1', 'alert-id-2'],
              index: ['alert-index-1', 'alert-index-2'],
            },
          ],
        },
        userAction,
      });

      const createdUserAction = builder.build();
      const res = appMockRender.render(<EuiCommentList comments={createdUserAction} />);

      expect(res.getByTestId('multiple-alerts-user-action-alert-action-id')).toHaveTextContent(
        'added 2 alerts from Awesome rule'
      );
      expect(res.getByTestId('comment-action-show-alerts-1234'));
    });

    it('deletes multiple alerts correctly', async () => {
      const userAction = getAlertUserAction();

      const builder = createCommentUserActionBuilder({
        ...builderArgs,
        caseData: {
          ...builderArgs.caseData,
          comments: [
            {
              ...alertComment,
              alertId: ['alert-id-1', 'alert-id-2'],
              index: ['alert-index-1', 'alert-index-2'],
            },
          ],
        },
        userAction,
      });

      const createdUserAction = builder.build();
      const res = appMockRender.render(<EuiCommentList comments={createdUserAction} />);

      expect(screen.getByTestId('multiple-alerts-user-action-alert-action-id')).toHaveTextContent(
        'added 2 alerts from Awesome rule'
      );

      await deleteAttachment(res, 'minusInCircle', 'Remove');

      await waitFor(() => {
        expect(builderArgs.handleDeleteComment).toHaveBeenCalledWith(
          'alert-comment-id',
          'Deleted 2 alerts'
        );
      });
    });

    it('views multiple alerts correctly', async () => {
      useCaseViewParamsMock.mockReturnValue({ detailName: '1234' });
      const userAction = getAlertUserAction();

      const builder = createCommentUserActionBuilder({
        ...builderArgs,
        caseData: {
          ...builderArgs.caseData,
          comments: [
            {
              ...alertComment,
              alertId: ['alert-id-1', 'alert-id-2'],
              index: ['alert-index-1', 'alert-index-2'],
            },
          ],
        },
        userAction,
      });

      const createdUserAction = builder.build();
      const res = appMockRender.render(<EuiCommentList comments={createdUserAction} />);

      expect(res.getByTestId('comment-action-show-alerts-1234'));
      userEvent.click(res.getByTestId('comment-action-show-alerts-1234'));

      await waitFor(() => {
        expect(navigateToCaseView).toHaveBeenCalledWith({ detailName: '1234', tabId: 'alerts' });
      });
    });
  });

  describe('Host isolation action', () => {
    it('renders correctly an action', async () => {
      const userAction = getHostIsolationUserAction();

      const builder = createCommentUserActionBuilder({
        ...builderArgs,
        caseData: {
          ...builderArgs.caseData,
          comments: [hostIsolationComment()],
        },
        userAction,
      });

      const createdUserAction = builder.build();
      render(
        <TestProviders>
          <EuiCommentList comments={createdUserAction} />
        </TestProviders>
      );

      expect(screen.getByTestId('endpoint-action')).toBeInTheDocument();
      expect(screen.getByText('submitted isolate request on host')).toBeInTheDocument();
      expect(screen.getByText('host1')).toBeInTheDocument();
      expect(screen.getByText('I just isolated the host!')).toBeInTheDocument();
    });

    it('shows the correct username', async () => {
      const createdBy = { profileUid: userProfiles[0].uid };
      const userAction = getHostIsolationUserAction({
        createdBy,
      });

      const builder = createCommentUserActionBuilder({
        ...builderArgs,
        caseData: {
          ...builderArgs.caseData,
          comments: [hostIsolationComment({ createdBy })],
        },
        userAction,
      });

      const createdUserAction = builder.build();
      render(
        <TestProviders>
          <EuiCommentList comments={createdUserAction} />
        </TestProviders>
      );

      expect(
        screen.getAllByTestId('case-user-profile-avatar-damaged_raccoon')[0]
      ).toBeInTheDocument();
      expect(screen.getAllByText('DR')[0]).toBeInTheDocument();
      expect(screen.getAllByText('Damaged Raccoon')[0]).toBeInTheDocument();
    });
  });

  describe('Attachment framework', () => {
    let appMockRender: AppMockRenderer;

    beforeEach(() => {
      appMockRender = createAppMockRenderer();
    });

    describe('External references', () => {
      it('renders correctly an external reference', async () => {
        const externalReferenceAttachmentTypeRegistry =
          new ExternalReferenceAttachmentTypeRegistry();
        externalReferenceAttachmentTypeRegistry.register(getExternalReferenceAttachment());

        const userAction = getExternalReferenceUserAction();
        const damagedRaccoon = userProfiles[0];
        const builder = createCommentUserActionBuilder({
          ...builderArgs,
          externalReferenceAttachmentTypeRegistry,
          caseData: {
            ...builderArgs.caseData,
            comments: [
              {
                ...externalReferenceAttachment,
                createdBy: {
                  username: damagedRaccoon.user.username,
                  fullName: damagedRaccoon.user.full_name,
                  email: damagedRaccoon.user.email,
                },
              },
            ],
          },
          userAction,
        });

        const createdUserAction = builder.build();
        appMockRender.render(<EuiCommentList comments={createdUserAction} />);

        expect(screen.getByTestId('comment-externalReference-.test')).toBeInTheDocument();
        expect(screen.getByTestId('copy-link-external-reference-comment-id')).toBeInTheDocument();
        expect(screen.getByTestId('case-user-profile-avatar-damaged_raccoon')).toBeInTheDocument();
        expect(screen.getByText('added a chart')).toBeInTheDocument();
      });

      it('renders correctly if the reference is not registered', async () => {
        const externalReferenceAttachmentTypeRegistry =
          new ExternalReferenceAttachmentTypeRegistry();

        const userAction = getExternalReferenceUserAction();
        const builder = createCommentUserActionBuilder({
          ...builderArgs,
          externalReferenceAttachmentTypeRegistry,
          caseData: {
            ...builderArgs.caseData,
            comments: [externalReferenceAttachment],
          },
          userAction,
        });

        const createdUserAction = builder.build();
        appMockRender.render(<EuiCommentList comments={createdUserAction} />);

        expect(screen.getByTestId('comment-externalReference-not-found')).toBeInTheDocument();
        expect(screen.getByText('added an attachment of type')).toBeInTheDocument();
        expect(screen.getByText('Attachment type is not registered')).toBeInTheDocument();
      });

      it('deletes the attachment correctly', async () => {
        const externalReferenceAttachmentTypeRegistry =
          new ExternalReferenceAttachmentTypeRegistry();
        externalReferenceAttachmentTypeRegistry.register(getExternalReferenceAttachment());

        const userAction = getExternalReferenceUserAction();
        const builder = createCommentUserActionBuilder({
          ...builderArgs,
          externalReferenceAttachmentTypeRegistry,
          caseData: {
            ...builderArgs.caseData,
            comments: [externalReferenceAttachment],
          },
          userAction,
        });

        const createdUserAction = builder.build();
        const result = appMockRender.render(<EuiCommentList comments={createdUserAction} />);

        expect(screen.getByTestId('comment-externalReference-.test')).toBeInTheDocument();

        await deleteAttachment(result, 'trash', 'Delete');

        await waitFor(() => {
          expect(builderArgs.handleDeleteComment).toHaveBeenCalledWith(
            'external-reference-comment-id',
            'Deleted attachment'
          );
        });
      });
    });

    describe('Persistable state', () => {
      it('renders correctly a persistable state attachment', async () => {
        const MockComponent = jest.fn((props) => {
          return (
            <div data-test-subj={`attachment_${props.persistableStateAttachmentState.test_foo}`} />
          );
        });

        const SpyLazyFactory = jest.fn(() => {
          return Promise.resolve().then(() => {
            return {
              default: React.memo(MockComponent),
            };
          });
        });

        const persistableStateAttachmentTypeRegistry = new PersistableStateAttachmentTypeRegistry();
        persistableStateAttachmentTypeRegistry.register(
          getPersistableStateAttachment({
            children: React.lazy(SpyLazyFactory),
          })
        );

        const userAction = getPersistableStateUserAction();
        const attachment01 = {
          ...persistableStateAttachment,
          persistableStateAttachmentState: { test_foo: '01' },
          createdBy: {
            username: userProfiles[0].user.username,
            fullName: userProfiles[0].user.full_name,
            email: userProfiles[0].user.email,
            profileUid: userProfiles[0].uid,
          },
        };
        const builder = createCommentUserActionBuilder({
          ...builderArgs,
          persistableStateAttachmentTypeRegistry,
          caseData: {
            ...builderArgs.caseData,
            comments: [attachment01],
          },
          userAction,
        });

        const result = appMockRender.render(<EuiCommentList comments={builder.build()} />);

        await waitFor(() => {
          expect(screen.getByTestId('attachment_01')).toBeInTheDocument();
          expect(MockComponent).toHaveBeenCalledTimes(1);
          expect(SpyLazyFactory).toHaveBeenCalledTimes(1);
        });

        expect(screen.getByTestId('comment-persistableState-.test')).toBeInTheDocument();
        expect(screen.getByTestId('copy-link-persistable-state-comment-id')).toBeInTheDocument();
        expect(screen.getByTestId('case-user-profile-avatar-damaged_raccoon')).toBeInTheDocument();
        expect(screen.getByText('added an embeddable')).toBeInTheDocument();

        result.unmount();

        const attachment02 = {
          ...persistableStateAttachment,
          persistableStateAttachmentState: { test_foo: '02' },
        };
        const updateBuilder = createCommentUserActionBuilder({
          ...builderArgs,
          persistableStateAttachmentTypeRegistry,
          caseData: {
            ...builderArgs.caseData,
            comments: [attachment02],
          },
          userAction,
        });

        const result2 = appMockRender.render(<EuiCommentList comments={updateBuilder.build()} />);

        await waitFor(() => {
          expect(result2.getByTestId('attachment_02')).toBeInTheDocument();
          expect(MockComponent).toHaveBeenCalledTimes(2);
          expect(SpyLazyFactory).toHaveBeenCalledTimes(1);
        });
      });

      it('renders correctly if the reference is not registered', async () => {
        const persistableStateAttachmentTypeRegistry = new PersistableStateAttachmentTypeRegistry();

        const userAction = getPersistableStateUserAction();
        const builder = createCommentUserActionBuilder({
          ...builderArgs,
          persistableStateAttachmentTypeRegistry,
          caseData: {
            ...builderArgs.caseData,
            comments: [persistableStateAttachment],
          },
          userAction,
        });

        const createdUserAction = builder.build();
        appMockRender.render(<EuiCommentList comments={createdUserAction} />);

        expect(screen.getByTestId('comment-persistableState-not-found')).toBeInTheDocument();
        expect(screen.getByText('added an attachment of type')).toBeInTheDocument();
        expect(screen.getByText('Attachment type is not registered')).toBeInTheDocument();
      });

      it('deletes the attachment correctly', async () => {
        const attachment = getPersistableStateAttachment();
        const persistableStateAttachmentTypeRegistry = new PersistableStateAttachmentTypeRegistry();
        persistableStateAttachmentTypeRegistry.register(attachment);

        const userAction = getPersistableStateUserAction();
        const builder = createCommentUserActionBuilder({
          ...builderArgs,
          persistableStateAttachmentTypeRegistry,
          caseData: {
            ...builderArgs.caseData,
            comments: [persistableStateAttachment],
          },
          userAction,
        });

        const createdUserAction = builder.build();
        const result = appMockRender.render(<EuiCommentList comments={createdUserAction} />);

        expect(screen.getByTestId('comment-persistableState-.test')).toBeInTheDocument();

        await deleteAttachment(result, 'trash', 'Delete');

        await waitFor(() => {
          expect(builderArgs.handleDeleteComment).toHaveBeenCalledWith(
            'persistable-state-comment-id',
            'Deleted attachment'
          );
        });
      });
    });

    it('shows correctly the visible primary actions', async () => {
      const onClick = jest.fn();

      const attachment = getExternalReferenceAttachment({
        getActions: () => [
          {
            type: AttachmentActionType.BUTTON as const,
            label: 'My primary button',
            isPrimary: true,
            iconType: 'danger',
            onClick,
          },
          {
            type: AttachmentActionType.BUTTON as const,
            label: 'My primary 2 button',
            isPrimary: true,
            iconType: 'danger',
            onClick,
          },
          {
            type: AttachmentActionType.BUTTON as const,
            label: 'My primary 3 button',
            isPrimary: true,
            iconType: 'danger',
            onClick,
          },
        ],
      });

      const externalReferenceAttachmentTypeRegistry = new ExternalReferenceAttachmentTypeRegistry();
      externalReferenceAttachmentTypeRegistry.register(attachment);

      const userAction = getExternalReferenceUserAction();
      const builder = createCommentUserActionBuilder({
        ...builderArgs,
        externalReferenceAttachmentTypeRegistry,
        caseData: {
          ...builderArgs.caseData,
          comments: [externalReferenceAttachment],
        },
        userAction,
      });

      const createdUserAction = builder.build();
      appMockRender.render(<EuiCommentList comments={createdUserAction} />);

      expect(screen.getByTestId('comment-externalReference-.test')).toBeInTheDocument();
      expect(screen.getByLabelText('My primary button')).toBeInTheDocument();
      expect(screen.getByLabelText('My primary 2 button')).toBeInTheDocument();
      expect(screen.queryByLabelText('My primary 3 button')).not.toBeInTheDocument();

      userEvent.click(screen.getByLabelText('My primary button'), undefined, {
        skipPointerEventsCheck: true,
      });

      userEvent.click(screen.getByLabelText('My primary 2 button'), undefined, {
        skipPointerEventsCheck: true,
      });

      expect(onClick).toHaveBeenCalledTimes(2);
    });

    it('shows correctly a custom action', async () => {
      const onClick = jest.fn();

      const attachment = getExternalReferenceAttachment({
        getActions: () => [
          {
            type: AttachmentActionType.CUSTOM as const,
            isPrimary: true,
            label: 'Test button',
            render: () => (
              <button type="button" onClick={onClick} data-test-subj="my-custom-button" />
            ),
          },
        ],
      });

      const externalReferenceAttachmentTypeRegistry = new ExternalReferenceAttachmentTypeRegistry();
      externalReferenceAttachmentTypeRegistry.register(attachment);

      const userAction = getExternalReferenceUserAction();
      const builder = createCommentUserActionBuilder({
        ...builderArgs,
        externalReferenceAttachmentTypeRegistry,
        caseData: {
          ...builderArgs.caseData,
          comments: [externalReferenceAttachment],
        },
        userAction,
      });

      const createdUserAction = builder.build();

      appMockRender.render(<EuiCommentList comments={createdUserAction} />);

      const customButton = await screen.findByTestId('my-custom-button');

      expect(customButton).toBeInTheDocument();

      userEvent.click(customButton);

      expect(onClick).toHaveBeenCalledTimes(1);
    });

    it('shows correctly the non visible primary actions', async () => {
      const onClick = jest.fn();

      const attachment = getExternalReferenceAttachment({
        getActions: () => [
          {
            type: AttachmentActionType.BUTTON,
            label: 'My primary button',
            isPrimary: true,
            iconType: 'danger',
            onClick,
          },
          {
            type: AttachmentActionType.BUTTON,
            label: 'My primary 2 button',
            isPrimary: true,
            iconType: 'danger',
            onClick,
          },
          {
            type: AttachmentActionType.BUTTON,
            label: 'My primary 3 button',
            isPrimary: true,
            iconType: 'danger',
            onClick,
          },
        ],
      });

      const externalReferenceAttachmentTypeRegistry = new ExternalReferenceAttachmentTypeRegistry();
      externalReferenceAttachmentTypeRegistry.register(attachment);

      const userAction = getExternalReferenceUserAction();
      const builder = createCommentUserActionBuilder({
        ...builderArgs,
        externalReferenceAttachmentTypeRegistry,
        caseData: {
          ...builderArgs.caseData,
          comments: [externalReferenceAttachment],
        },
        userAction,
      });

      const createdUserAction = builder.build();
      appMockRender.render(<EuiCommentList comments={createdUserAction} />);

      expect(screen.getByTestId('comment-externalReference-.test')).toBeInTheDocument();
      expect(screen.getByLabelText('My primary button')).toBeInTheDocument();
      expect(screen.getByLabelText('My primary 2 button')).toBeInTheDocument();
      expect(screen.queryByLabelText('My primary 3 button')).not.toBeInTheDocument();

      expect(screen.getByTestId('property-actions-user-action')).toBeInTheDocument();
      userEvent.click(screen.getByTestId('property-actions-user-action-ellipses'));
      await waitForEuiPopoverOpen();

      expect(screen.getByText('My primary 3 button')).toBeInTheDocument();

      userEvent.click(screen.getByText('My primary 3 button'), undefined, {
        skipPointerEventsCheck: true,
      });

      expect(onClick).toHaveBeenCalled();
    });

    it('hides correctly the  default actions', async () => {
      const onClick = jest.fn();

      const attachment = getExternalReferenceAttachment({
        getActions: () => [
          {
            type: AttachmentActionType.BUTTON as const,
            label: 'My primary button',
            isPrimary: true,
            iconType: 'danger',
            onClick,
          },
          {
            type: AttachmentActionType.BUTTON as const,
            label: 'My button',
            iconType: 'download',
            onClick,
          },
        ],
        hideDefaultActions: true,
      });

      const externalReferenceAttachmentTypeRegistry = new ExternalReferenceAttachmentTypeRegistry();
      externalReferenceAttachmentTypeRegistry.register(attachment);

      const userAction = getExternalReferenceUserAction();
      const builder = createCommentUserActionBuilder({
        ...builderArgs,
        externalReferenceAttachmentTypeRegistry,
        caseData: {
          ...builderArgs.caseData,
          comments: [externalReferenceAttachment],
        },
        userAction,
      });

      const createdUserAction = builder.build();
      appMockRender.render(<EuiCommentList comments={createdUserAction} />);

      expect(screen.getByTestId('comment-externalReference-.test')).toBeInTheDocument();
      expect(screen.getByLabelText('My primary button')).toBeInTheDocument();
      expect(screen.getByTestId('property-actions-user-action')).toBeInTheDocument();

      userEvent.click(screen.getByTestId('property-actions-user-action-ellipses'));

      await waitForEuiPopoverOpen();

      // default "Delete attachment" action
      expect(screen.queryByTestId('property-actions-user-action-trash')).not.toBeInTheDocument();
      expect(screen.queryByText('Delete attachment')).not.toBeInTheDocument();
      expect(screen.getByText('My button')).toBeInTheDocument();

      userEvent.click(screen.getByText('My button'), undefined, { skipPointerEventsCheck: true });

      expect(onClick).toHaveBeenCalledTimes(1);
    });

    it('shows correctly the registered primary actions and non-primary actions', async () => {
      const onClick = jest.fn();

      const attachment = getExternalReferenceAttachment({
        getActions: () => [
          {
            type: AttachmentActionType.BUTTON as const,
            label: 'My button',
            iconType: 'trash',
            onClick,
          },
          {
            type: AttachmentActionType.BUTTON as const,
            label: 'My button 2',
            iconType: 'download',
            onClick,
          },
          {
            type: AttachmentActionType.BUTTON as const,
            label: 'My primary button',
            isPrimary: true,
            iconType: 'danger',
            onClick,
          },
          {
            type: AttachmentActionType.BUTTON as const,
            label: 'My primary 2 button',
            isPrimary: true,
            iconType: 'danger',
            onClick,
          },
          {
            type: AttachmentActionType.BUTTON as const,
            label: 'My primary 3 button',
            isPrimary: true,
            iconType: 'danger',
            onClick,
          },
        ],
      });

      const externalReferenceAttachmentTypeRegistry = new ExternalReferenceAttachmentTypeRegistry();
      externalReferenceAttachmentTypeRegistry.register(attachment);

      const userAction = getExternalReferenceUserAction();
      const builder = createCommentUserActionBuilder({
        ...builderArgs,
        externalReferenceAttachmentTypeRegistry,
        caseData: {
          ...builderArgs.caseData,
          comments: [externalReferenceAttachment],
        },
        userAction,
      });

      const createdUserAction = builder.build();
      appMockRender.render(<EuiCommentList comments={createdUserAction} />);

      expect(screen.getByTestId('comment-externalReference-.test')).toBeInTheDocument();
      expect(screen.getByLabelText('My primary button')).toBeInTheDocument();
      expect(screen.getByLabelText('My primary 2 button')).toBeInTheDocument();
      expect(screen.queryByLabelText('My primary 3 button')).not.toBeInTheDocument();

      expect(screen.getByTestId('property-actions-user-action')).toBeInTheDocument();
      userEvent.click(screen.getByTestId('property-actions-user-action-ellipses'));
      await waitForEuiPopoverOpen();

      expect(screen.getByText('My button')).toBeInTheDocument();
      expect(screen.getByText('My button 2')).toBeInTheDocument();
      expect(screen.getByText('My primary 3 button')).toBeInTheDocument();

      userEvent.click(screen.getByText('My button'), undefined, { skipPointerEventsCheck: true });
      userEvent.click(screen.getByText('My button 2'), undefined, {
        skipPointerEventsCheck: true,
      });

      expect(onClick).toHaveBeenCalledTimes(2);
    });

    it('divides correctly less than two primary actions', async () => {
      const onClick = jest.fn();

      const attachment = getExternalReferenceAttachment({
        getActions: () => [
          {
            type: AttachmentActionType.BUTTON as const,
            label: 'My primary button',
            isPrimary: true,
            iconType: 'danger',
            onClick,
          },
        ],
      });

      const externalReferenceAttachmentTypeRegistry = new ExternalReferenceAttachmentTypeRegistry();
      externalReferenceAttachmentTypeRegistry.register(attachment);

      const userAction = getExternalReferenceUserAction();
      const builder = createCommentUserActionBuilder({
        ...builderArgs,
        externalReferenceAttachmentTypeRegistry,
        caseData: {
          ...builderArgs.caseData,
          comments: [externalReferenceAttachment],
        },
        userAction,
      });

      const createdUserAction = builder.build();
      appMockRender.render(<EuiCommentList comments={createdUserAction} />);

      expect(screen.getByTestId('comment-externalReference-.test')).toBeInTheDocument();
      expect(screen.getByLabelText('My primary button')).toBeInTheDocument();

      userEvent.click(screen.getByLabelText('My primary button'), undefined, {
        skipPointerEventsCheck: true,
      });

      expect(onClick).toHaveBeenCalled();
    });
  });
});

const deleteAttachment = async (result: RenderResult, deleteIcon: string, buttonLabel: string) => {
  expect(screen.getByTestId('property-actions-user-action')).toBeInTheDocument();

  userEvent.click(screen.getByTestId('property-actions-user-action-ellipses'));
  await waitForEuiPopoverOpen();

  expect(screen.queryByTestId(`property-actions-user-action-${deleteIcon}`)).toBeInTheDocument();

  userEvent.click(screen.getByTestId(`property-actions-user-action-${deleteIcon}`));

  await waitFor(() => {
    expect(screen.queryByTestId('property-actions-confirm-modal')).toBeInTheDocument();
  });

  userEvent.click(screen.getByText(buttonLabel));
};
