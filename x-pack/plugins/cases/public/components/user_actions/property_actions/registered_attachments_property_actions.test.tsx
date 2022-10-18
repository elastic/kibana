/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { waitForEuiPopoverOpen } from '@elastic/eui/lib/test/rtl';
import { waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { AppMockRenderer } from '../../../common/mock';
import { createAppMockRenderer } from '../../../common/mock';
import { RegisteredAttachmentsPropertyActions } from './registered_attachments_property_actions';

describe('RegisteredAttachmentsPropertyActions', () => {
  let appMock: AppMockRenderer;

  const props = {
    isLoading: false,
    onDelete: jest.fn(),
  };

  beforeEach(() => {
    appMock = createAppMockRenderer();
    jest.clearAllMocks();
  });

  it('renders the correct number of actions', async () => {
    const result = appMock.render(<RegisteredAttachmentsPropertyActions {...props} />);

    expect(result.getByTestId('property-actions')).toBeInTheDocument();

    userEvent.click(result.getByTestId('property-actions-ellipses'));
    await waitForEuiPopoverOpen();

    expect(result.getByTestId('property-actions-group').children.length).toBe(1);
    expect(result.queryByTestId('property-actions-trash')).toBeInTheDocument();
  });

  it('renders the modal info correctly', async () => {
    const result = appMock.render(<RegisteredAttachmentsPropertyActions {...props} />);

    expect(result.getByTestId('property-actions')).toBeInTheDocument();

    userEvent.click(result.getByTestId('property-actions-ellipses'));
    await waitForEuiPopoverOpen();

    expect(result.queryByTestId('property-actions-trash')).toBeInTheDocument();

    userEvent.click(result.getByTestId('property-actions-trash'));

    await waitFor(() => {
      expect(result.queryByTestId('property-actions-confirm-modal')).toBeInTheDocument();
    });

    expect(result.getByTestId('confirmModalTitleText')).toHaveTextContent('Delete attachment');
    expect(result.getByText('Delete')).toBeInTheDocument();
  });

  it('remove attachments correctly', async () => {
    const result = appMock.render(<RegisteredAttachmentsPropertyActions {...props} />);

    expect(result.getByTestId('property-actions')).toBeInTheDocument();

    userEvent.click(result.getByTestId('property-actions-ellipses'));
    await waitForEuiPopoverOpen();

    expect(result.queryByTestId('property-actions-trash')).toBeInTheDocument();

    userEvent.click(result.getByTestId('property-actions-trash'));

    await waitFor(() => {
      expect(result.queryByTestId('property-actions-confirm-modal')).toBeInTheDocument();
    });

    userEvent.click(result.getByText('Delete'));
    expect(props.onDelete).toHaveBeenCalled();
  });
});
