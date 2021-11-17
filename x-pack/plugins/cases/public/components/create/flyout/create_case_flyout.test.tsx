/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { act, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { CreateCaseFlyout } from './create_case_flyout';
import { TestProviders } from '../../../common/mock';

jest.mock('../../../common/lib/kibana');

const onClose = jest.fn();
const onSuccess = jest.fn();
const defaultProps = {
  onClose,
  onSuccess,
  owner: 'securitySolution',
};

describe('CreateCaseFlyout', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders', async () => {
    render(
      <TestProviders>
        <CreateCaseFlyout {...defaultProps} />
      </TestProviders>
    );

    await waitFor(() => expect(screen.getByText('Create new case')).toBeInTheDocument());
  });

  it('Closing flyout calls onCloseCaseModal', async () => {
    render(
      <TestProviders>
        <CreateCaseFlyout {...defaultProps} />
      </TestProviders>
    );

    userEvent.click(screen.getByTestId('euiFlyoutCloseButton'));
    await waitFor(() => expect(onClose).toBeCalled());
  });
});
