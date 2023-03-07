/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiCommentList } from '@elastic/eui';
import { render, screen, waitFor } from '@testing-library/react';

import { Actions } from '../../../common/api';
import { getUserAction } from '../../containers/mock';
import { TestProviders } from '../../common/mock';
import { createDescriptionUserActionBuilder, getDescriptionUserAction } from './description';
import { getMockBuilderArgs } from './mock';
import userEvent from '@testing-library/user-event';

jest.mock('../../common/lib/kibana');
jest.mock('../../common/navigation/hooks');

describe('createDescriptionUserActionBuilder ', () => {
  const onUpdateField = jest.fn();
  const builderArgs = getMockBuilderArgs();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders correctly description', async () => {
    const descriptionUserAction = getDescriptionUserAction({
      ...builderArgs,
      onUpdateField,
      isLoadingDescription: false,
    });

    render(
      <TestProviders>
        <EuiCommentList comments={[descriptionUserAction]} />
      </TestProviders>
    );

    expect(screen.getByText('added description')).toBeInTheDocument();
    expect(screen.getByText('Security banana Issue')).toBeInTheDocument();
  });

  it('edits the description correctly', async () => {
    const descriptionUserAction = getDescriptionUserAction({
      ...builderArgs,
      onUpdateField,
      isLoadingDescription: false,
    });

    const res = render(
      <TestProviders>
        <EuiCommentList comments={[descriptionUserAction]} />
      </TestProviders>
    );

    userEvent.click(res.getByTestId('editable-description-edit-icon'));

    await waitFor(() => {
      expect(builderArgs.handleManageMarkdownEditId).toHaveBeenCalledWith('description');
    });
  });

  it('renders correctly when editing a description', async () => {
    const userAction = getUserAction('description', Actions.update);
    const builder = createDescriptionUserActionBuilder({
      ...builderArgs,
      userAction,
    });

    const createdUserAction = builder.build();
    render(
      <TestProviders>
        <EuiCommentList comments={createdUserAction} />
      </TestProviders>
    );

    expect(screen.getByText('edited description')).toBeInTheDocument();
  });
});
