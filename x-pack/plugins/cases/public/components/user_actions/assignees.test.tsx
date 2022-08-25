/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiCommentList } from '@elastic/eui';
import { render, screen } from '@testing-library/react';

import { Actions } from '../../../common/api';
import { elasticUser, getUserAction } from '../../containers/mock';
import { TestProviders } from '../../common/mock';
import { createAssigneesUserActionBuilder } from './assignees';
import { getMockBuilderArgs } from './mock';

jest.mock('../../common/lib/kibana');
jest.mock('../../common/navigation/hooks');

describe('createAssigneesUserActionBuilder', () => {
  const builderArgs = getMockBuilderArgs();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders assigned users', () => {
    const userAction = getUserAction('assignees', Actions.add, {
      createdBy: {
        // damaged_raccoon uid
        profileUid: 'u_J41Oh6L9ki-Vo2tOogS8WRTENzhHurGtRc87NgEAlkc_0',
      },
    });
    const builder = createAssigneesUserActionBuilder({
      ...builderArgs,
      userAction,
    });

    const createdUserAction = builder.build();
    render(
      <TestProviders>
        <EuiCommentList comments={createdUserAction} />
      </TestProviders>
    );

    expect(screen.getByText('assigned')).toBeInTheDocument();
    expect(screen.getByText('themselves,')).toBeInTheDocument();
    expect(screen.getByText('Physical Dinosaur')).toBeInTheDocument();

    expect(screen.getByTestId('ua-assignee-physical_dinosaur')).toContainElement(
      screen.getByText('and')
    );
  });

  it('renders unassigned users', () => {
    const userAction = getUserAction('assignees', Actions.delete, {
      createdBy: {
        // damaged_raccoon uid
        profileUid: 'u_J41Oh6L9ki-Vo2tOogS8WRTENzhHurGtRc87NgEAlkc_0',
      },
    });
    const builder = createAssigneesUserActionBuilder({
      ...builderArgs,
      userAction,
    });

    const createdUserAction = builder.build();
    render(
      <TestProviders>
        <EuiCommentList comments={createdUserAction} />
      </TestProviders>
    );

    expect(screen.getByText('unassigned')).toBeInTheDocument();
    expect(screen.getByText('themselves,')).toBeInTheDocument();
    expect(screen.getByText('Physical Dinosaur')).toBeInTheDocument();

    expect(screen.getByTestId('ua-assignee-physical_dinosaur')).toContainElement(
      screen.getByText('and')
    );
  });

  it('renders a single assigned user', () => {
    const userAction = getUserAction('assignees', Actions.add, {
      payload: {
        assignees: [
          // only render the physical dinosaur
          { uid: 'u_A_tM4n0wPkdiQ9smmd8o0Hr_h61XQfu8aRPh9GMoRoc_0' },
        ],
      },
    });
    const builder = createAssigneesUserActionBuilder({
      ...builderArgs,
      userAction,
    });

    const createdUserAction = builder.build();
    render(
      <TestProviders>
        <EuiCommentList comments={createdUserAction} />
      </TestProviders>
    );

    expect(screen.getByText('Physical Dinosaur')).toBeInTheDocument();
    expect(screen.queryByText('themselves,')).not.toBeInTheDocument();
    expect(screen.queryByText('and')).not.toBeInTheDocument();
  });

  it('renders a single assigned user that is themselves using matching profile uids', () => {
    const userAction = getUserAction('assignees', Actions.add, {
      createdBy: {
        ...elasticUser,
        profileUid: 'u_J41Oh6L9ki-Vo2tOogS8WRTENzhHurGtRc87NgEAlkc_0',
      },
      payload: {
        assignees: [
          // only render the damaged raccoon which is the current user
          { uid: 'u_J41Oh6L9ki-Vo2tOogS8WRTENzhHurGtRc87NgEAlkc_0' },
        ],
      },
    });
    const builder = createAssigneesUserActionBuilder({
      ...builderArgs,
      userAction,
    });

    const createdUserAction = builder.build();
    render(
      <TestProviders>
        <EuiCommentList comments={createdUserAction} />
      </TestProviders>
    );

    expect(screen.getByText('themselves')).toBeInTheDocument();
    expect(screen.queryByText('Physical Dinosaur')).not.toBeInTheDocument();
    expect(screen.queryByText('and')).not.toBeInTheDocument();
  });

  it('renders a single assigned user that is themselves using matching usernames', () => {
    const userAction = getUserAction('assignees', Actions.add, {
      createdBy: {
        ...elasticUser,
        username: 'damaged_raccoon',
      },
      payload: {
        assignees: [
          // only render the damaged raccoon which is the current user
          { uid: 'u_J41Oh6L9ki-Vo2tOogS8WRTENzhHurGtRc87NgEAlkc_0' },
        ],
      },
    });
    const builder = createAssigneesUserActionBuilder({
      ...builderArgs,
      userAction,
    });

    const createdUserAction = builder.build();
    render(
      <TestProviders>
        <EuiCommentList comments={createdUserAction} />
      </TestProviders>
    );

    expect(screen.getByText('themselves')).toBeInTheDocument();
    expect(screen.queryByText('Physical Dinosaur')).not.toBeInTheDocument();
    expect(screen.queryByText('and')).not.toBeInTheDocument();
  });
});
