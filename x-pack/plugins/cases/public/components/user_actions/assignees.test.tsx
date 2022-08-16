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
import { getUserAction } from '../../containers/mock';
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

  it('renders assigned users', async () => {
    const userAction = getUserAction('assignees', Actions.add);
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
    expect(screen.getByText('themselves')).toBeInTheDocument();
    expect(screen.getByText('Physical Dinosaur')).toBeInTheDocument();
  });

  it('renders unassigned users', async () => {
    const userAction = getUserAction('assignees', Actions.delete);
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
    expect(screen.getByText('themselves')).toBeInTheDocument();
    expect(screen.getByText('Physical Dinosaur')).toBeInTheDocument();
  });
});
