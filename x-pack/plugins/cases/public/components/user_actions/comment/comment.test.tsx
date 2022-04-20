/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiCommentList } from '@elastic/eui';
import { render, screen } from '@testing-library/react';

import { Actions } from '../../../../common/api';
import {
  alertComment,
  basicCase,
  getAlertUserAction,
  getHostIsolationUserAction,
  getUserAction,
  hostIsolationComment,
} from '../../../containers/mock';
import { TestProviders } from '../../../common/mock';
import { createCommentUserActionBuilder } from './comment';
import { getMockBuilderArgs } from '../mock';

jest.mock('../../../common/lib/kibana');
jest.mock('../../../common/navigation/hooks');

describe('createCommentUserActionBuilder', () => {
  const builderArgs = getMockBuilderArgs();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders correctly when editing a comment', async () => {
    const userAction = getUserAction('comment', Actions.update);
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

  it('renders correctly when deleting a comment', async () => {
    const userAction = getUserAction('comment', Actions.delete);
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

  it('renders correctly a user comment', async () => {
    const userAction = getUserAction('comment', Actions.create, {
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
  });

  describe('Multiple alerts', () => {
    it('renders correctly multiple alerts', async () => {
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
      render(
        <TestProviders>
          <EuiCommentList comments={createdUserAction} />
        </TestProviders>
      );

      expect(screen.getByTestId('multiple-alerts-user-action-alert-action-id')).toHaveTextContent(
        'added 2 alerts from Awesome rule'
      );
    });
  });

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

    expect(screen.getByText('submitted isolate request on host')).toBeInTheDocument();
    expect(screen.getByText('host1')).toBeInTheDocument();
    expect(screen.getByText('I just isolated the host!')).toBeInTheDocument();
  });
});
