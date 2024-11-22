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
import { DeleteConfirmationModal } from './delete_confirmation_modal';

describe('DeleteConfirmationModal', () => {
  let appMock: AppMockRenderer;
  const props = {
    label: 'My custom field',
    onCancel: jest.fn(),
    onConfirm: jest.fn(),
  };

  beforeEach(() => {
    appMock = createAppMockRenderer();
    jest.clearAllMocks();
  });

  it('renders correctly', async () => {
    const result = appMock.render(<DeleteConfirmationModal {...props} />);

    expect(result.getByTestId('confirm-delete-custom-field-modal')).toBeInTheDocument();
    expect(result.getByText('Delete')).toBeInTheDocument();
    expect(result.getByText('Cancel')).toBeInTheDocument();
  });

  it('calls onConfirm', async () => {
    const result = appMock.render(<DeleteConfirmationModal {...props} />);

    expect(result.getByText('Delete')).toBeInTheDocument();
    await userEvent.click(result.getByText('Delete'));

    expect(props.onConfirm).toHaveBeenCalled();
  });

  it('calls onCancel', async () => {
    const result = appMock.render(<DeleteConfirmationModal {...props} />);

    expect(result.getByText('Cancel')).toBeInTheDocument();
    await userEvent.click(result.getByText('Cancel'));

    expect(props.onCancel).toHaveBeenCalled();
  });
});
