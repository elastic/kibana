/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiCommentList } from '@elastic/eui';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import copy from 'copy-to-clipboard';

import { Actions } from '../../../common/api';
import { createCommonUpdateUserActionBuilder } from './common';
import { getUserAction } from '../../containers/mock';
import { TestProviders } from '../../common/mock';

jest.mock('../../common/lib/kibana');
jest.mock('../../common/navigation/hooks');
jest.mock('copy-to-clipboard', () => jest.fn());

describe('createCommonUpdateUserActionBuilder ', () => {
  const label = <>{'A label'}</>;
  const handleOutlineComment = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders correctly', async () => {
    const userAction = getUserAction('title', Actions.update);
    const builder = createCommonUpdateUserActionBuilder({
      userAction,
      label,
      icon: 'dot',
      handleOutlineComment,
    });

    const createdUserAction = builder.build();
    render(
      <TestProviders>
        <EuiCommentList comments={createdUserAction} />
      </TestProviders>
    );

    // The avatar
    expect(screen.getByText('LK')).toBeInTheDocument();
    // The username
    expect(screen.getByText(userAction.createdBy.username!)).toBeInTheDocument();
    // The label of the event
    expect(screen.getByText('A label')).toBeInTheDocument();
    // The copy link button
    expect(screen.getByLabelText('Copy reference link')).toBeInTheDocument();
  });

  it('renders shows the move to comment button if the user action is an edit comment', async () => {
    const userAction = getUserAction('comment', Actions.update);
    const builder = createCommonUpdateUserActionBuilder({
      userAction,
      label,
      icon: 'dot',
      handleOutlineComment,
    });

    const createdUserAction = builder.build();
    render(
      <TestProviders>
        <EuiCommentList comments={createdUserAction} />
      </TestProviders>
    );

    expect(screen.getByLabelText('Highlight the referenced comment')).toBeInTheDocument();
  });

  it('it copies the reference link when clicking the reference button', async () => {
    const userAction = getUserAction('comment', Actions.update);
    const builder = createCommonUpdateUserActionBuilder({
      userAction,
      label,
      icon: 'dot',
      handleOutlineComment,
    });

    const createdUserAction = builder.build();
    render(
      <TestProviders>
        <EuiCommentList comments={createdUserAction} />
      </TestProviders>
    );

    userEvent.click(screen.getByLabelText('Copy reference link'));
    expect(copy).toHaveBeenCalled();
  });

  it('calls the handleOutlineComment when clicking the reference button', async () => {
    const userAction = getUserAction('comment', Actions.update);
    const builder = createCommonUpdateUserActionBuilder({
      userAction,
      label,
      icon: 'dot',
      handleOutlineComment,
    });

    const createdUserAction = builder.build();
    render(
      <TestProviders>
        <EuiCommentList comments={createdUserAction} />
      </TestProviders>
    );

    userEvent.click(screen.getByLabelText('Highlight the referenced comment'));
    expect(handleOutlineComment).toHaveBeenCalled();
  });
});
