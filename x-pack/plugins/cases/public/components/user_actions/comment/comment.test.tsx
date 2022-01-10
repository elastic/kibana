/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiCommentList } from '@elastic/eui';
import { render, screen } from '@testing-library/react';

import { SECURITY_SOLUTION_OWNER } from '../../../../common/constants';
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

jest.mock('../../../common/lib/kibana');
jest.mock('../../../common/navigation/hooks');

describe('createCommentUserActionBuilder', () => {
  const commentRefs = { current: {} };
  const alertData = {
    rule: {
      id: 'rule-id',
      name: 'rule',
    },
    index: 'index-id',
    alertId: 'alert-id',
    owner: SECURITY_SOLUTION_OWNER,
  };

  const getRuleDetailsHref = jest.fn();
  const onRuleDetailsClick = jest.fn();
  const onShowAlertDetails = jest.fn();
  const handleManageMarkdownEditId = jest.fn();
  const handleSaveComment = jest.fn();
  const handleManageQuote = jest.fn();
  const handleOutlineComment = jest.fn();

  const args = {
    caseData: basicCase,
    alertData,
    userCanCrud: true,
    commentRefs,
    manageMarkdownEditIds: [],
    selectedOutlineCommentId: '',
    loadingCommentIds: [],
    loadingAlertData: false,
    getRuleDetailsHref,
    onRuleDetailsClick,
    onShowAlertDetails,
    handleManageMarkdownEditId,
    handleSaveComment,
    handleManageQuote,
    handleOutlineComment,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders correctly when editing a comment', async () => {
    const userAction = getUserAction('comment', Actions.update);
    // @ts-ignore no need to pass all the arguments
    const builder = createCommentUserActionBuilder({
      ...args,
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

  it('renders correctly a user comment', async () => {
    const userAction = getUserAction('comment', Actions.create, {
      commentId: basicCase.comments[0].id,
    });

    // @ts-ignore no need to pass all the arguments
    const builder = createCommentUserActionBuilder({
      ...args,
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

  it('renders correctly an alert', async () => {
    const userAction = getAlertUserAction();

    // @ts-ignore no need to pass all the arguments
    const builder = createCommentUserActionBuilder({
      ...args,
      caseData: {
        ...args.caseData,
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

    expect(screen.getByText('added an alert from')).toBeInTheDocument();
    expect(screen.getByText('Awesome rule')).toBeInTheDocument();
  });

  it('renders correctly an action', async () => {
    const userAction = getHostIsolationUserAction();

    // @ts-ignore no need to pass all the arguments
    const builder = createCommentUserActionBuilder({
      ...args,
      caseData: {
        ...args.caseData,
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
