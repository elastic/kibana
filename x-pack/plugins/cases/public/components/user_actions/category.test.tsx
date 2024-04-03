/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiCommentList } from '@elastic/eui';
import { render, screen } from '@testing-library/react';

import { getUserAction } from '../../containers/mock';
import { TestProviders } from '../../common/mock';
import { createCategoryUserActionBuilder } from './category';
import { getMockBuilderArgs } from './mock';
import { UserActionActions } from '../../../common/types/domain';

jest.mock('../../common/lib/kibana');
jest.mock('../../common/navigation/hooks');

describe('createCategoryUserActionBuilder ', () => {
  const builderArgs = getMockBuilderArgs();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders correctly when the category is updated', () => {
    const userAction = getUserAction('category', UserActionActions.update, {
      payload: { category: 'fantasy' },
    });
    const builder = createCategoryUserActionBuilder({
      ...builderArgs,
      userAction,
    });

    const createdUserAction = builder.build();
    render(
      <TestProviders>
        <EuiCommentList comments={createdUserAction} />
      </TestProviders>
    );

    expect(screen.getByTestId('category-update-category-user-action-title')).toBeInTheDocument();
    expect(screen.getByText('added the category "fantasy"')).toBeInTheDocument();
  });

  it('renders correctly when the category is removed', () => {
    const userAction = getUserAction('category', UserActionActions.delete, {
      payload: { category: null },
    });
    const builder = createCategoryUserActionBuilder({
      ...builderArgs,
      userAction,
    });

    const createdUserAction = builder.build();
    render(
      <TestProviders>
        <EuiCommentList comments={createdUserAction} />
      </TestProviders>
    );

    expect(screen.getByTestId('category-delete-category-user-action-title')).toBeInTheDocument();
    expect(screen.getByText('removed the category')).toBeInTheDocument();
  });
});
