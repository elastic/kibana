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
import { createTagsUserActionBuilder } from './tags';

jest.mock('../../common/lib/kibana');
jest.mock('../../common/navigation/hooks');

describe('createTagsUserActionBuilder ', () => {
  const handleOutlineComment = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders correctly when adding a tag', async () => {
    const userAction = getUserAction('tags', Actions.add);
    // @ts-ignore no need to pass all the arguments
    const builder = createTagsUserActionBuilder({
      userAction,
      handleOutlineComment,
    });

    const createdUserAction = builder.build();
    render(
      <TestProviders>
        <EuiCommentList comments={createdUserAction} />
      </TestProviders>
    );

    expect(screen.getByText('added tags')).toBeInTheDocument();
    expect(screen.getByText('a tag')).toBeInTheDocument();
  });

  it('renders correctly when deleting a tag', async () => {
    const userAction = getUserAction('tags', Actions.delete);
    // @ts-ignore no need to pass all the arguments
    const builder = createTagsUserActionBuilder({
      userAction,
      handleOutlineComment,
    });

    const createdUserAction = builder.build();
    render(
      <TestProviders>
        <EuiCommentList comments={createdUserAction} />
      </TestProviders>
    );

    expect(screen.getByText('removed tags')).toBeInTheDocument();
    expect(screen.getByText('a tag')).toBeInTheDocument();
  });
});
