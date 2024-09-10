/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import userEvent from '@testing-library/user-event';
import React from 'react';
import type { AppMockRenderer } from '../../common/mock';
import { createAppMockRenderer } from '../../common/mock';
import { CancelCreationConfirmationModal } from './cancel_creation_confirmation_modal';

describe('CancelCreationConfirmationModal', () => {
  let appMock: AppMockRenderer;
  const props = {
    title: 'My title',
    confirmButtonText: 'My confirm button text',
    cancelButtonText: 'My cancel button text',
    onCancel: jest.fn(),
    onConfirm: jest.fn(),
  };

  beforeEach(() => {
    appMock = createAppMockRenderer();
    jest.clearAllMocks();
  });

  it('renders correctly', async () => {
    const result = appMock.render(<CancelCreationConfirmationModal {...props} />);

    expect(result.getByTestId('cancel-creation-confirmation-modal')).toBeInTheDocument();
    expect(result.getByText(props.title)).toBeInTheDocument();
    expect(result.getByText(props.confirmButtonText)).toBeInTheDocument();
    expect(result.getByText(props.cancelButtonText)).toBeInTheDocument();
  });

  it('calls onConfirm', async () => {
    const result = appMock.render(<CancelCreationConfirmationModal {...props} />);

    expect(result.getByText(props.confirmButtonText)).toBeInTheDocument();
    await userEvent.click(result.getByText(props.confirmButtonText));

    expect(props.onConfirm).toHaveBeenCalled();
  });

  it('calls onCancel', async () => {
    const result = appMock.render(<CancelCreationConfirmationModal {...props} />);

    expect(result.getByText(props.cancelButtonText)).toBeInTheDocument();
    await userEvent.click(result.getByText(props.cancelButtonText));

    expect(props.onCancel).toHaveBeenCalled();
  });
});
