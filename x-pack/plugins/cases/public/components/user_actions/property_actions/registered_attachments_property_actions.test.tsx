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
import {
  noCasesPermissions,
  onlyDeleteCasesPermission,
  createAppMockRenderer,
} from '../../../common/mock';
import { RegisteredAttachmentsPropertyActions } from './registered_attachments_property_actions';
import { AttachmentActionType } from '../../../client/attachment_framework/types';

describe('RegisteredAttachmentsPropertyActions', () => {
  let appMock: AppMockRenderer;

  const props = {
    isLoading: false,
    registeredAttachmentActions: [],
    onDelete: jest.fn(),
    hideDefaultActions: false,
  };

  beforeEach(() => {
    appMock = createAppMockRenderer();
    jest.clearAllMocks();
  });

  it('renders the correct number of actions', async () => {
    const result = appMock.render(<RegisteredAttachmentsPropertyActions {...props} />);

    expect(result.getByTestId('property-actions-user-action')).toBeInTheDocument();

    userEvent.click(result.getByTestId('property-actions-user-action-ellipses'));
    await waitForEuiPopoverOpen();

    expect(result.getByTestId('property-actions-user-action-group').children.length).toBe(1);
    expect(result.queryByTestId('property-actions-user-action-trash')).toBeInTheDocument();
  });

  it('renders the modal info correctly', async () => {
    const result = appMock.render(<RegisteredAttachmentsPropertyActions {...props} />);

    expect(result.getByTestId('property-actions-user-action')).toBeInTheDocument();

    userEvent.click(result.getByTestId('property-actions-user-action-ellipses'));
    await waitForEuiPopoverOpen();

    expect(result.queryByTestId('property-actions-user-action-trash')).toBeInTheDocument();

    userEvent.click(result.getByTestId('property-actions-user-action-trash'));

    await waitFor(() => {
      expect(result.queryByTestId('property-actions-confirm-modal')).toBeInTheDocument();
    });

    expect(result.getByTestId('confirmModalTitleText')).toHaveTextContent('Delete attachment');
    expect(result.getByText('Delete')).toBeInTheDocument();
  });

  it('remove attachments correctly', async () => {
    const result = appMock.render(<RegisteredAttachmentsPropertyActions {...props} />);

    expect(result.getByTestId('property-actions-user-action')).toBeInTheDocument();

    userEvent.click(result.getByTestId('property-actions-user-action-ellipses'));
    await waitForEuiPopoverOpen();

    expect(result.queryByTestId('property-actions-user-action-trash')).toBeInTheDocument();

    userEvent.click(result.getByTestId('property-actions-user-action-trash'));

    await waitFor(() => {
      expect(result.queryByTestId('property-actions-confirm-modal')).toBeInTheDocument();
    });

    userEvent.click(result.getByText('Delete'));
    expect(props.onDelete).toHaveBeenCalled();
  });

  it('does not show the property actions without delete permissions', async () => {
    appMock = createAppMockRenderer({ permissions: noCasesPermissions() });
    const result = appMock.render(<RegisteredAttachmentsPropertyActions {...props} />);

    expect(result.queryByTestId('property-actions-user-action')).not.toBeInTheDocument();
  });

  it('does not show the property actions when hideDefaultActions is enabled', async () => {
    const result = appMock.render(
      <RegisteredAttachmentsPropertyActions {...props} hideDefaultActions={true} />
    );

    expect(result.queryByTestId('property-actions-user-action')).not.toBeInTheDocument();
  });

  it('does show the property actions with only delete permissions', async () => {
    appMock = createAppMockRenderer({ permissions: onlyDeleteCasesPermission() });
    const result = appMock.render(<RegisteredAttachmentsPropertyActions {...props} />);

    expect(result.getByTestId('property-actions-user-action')).toBeInTheDocument();
  });

  it('renders correctly registered attachments', async () => {
    const onClick = jest.fn();
    const action = [
      {
        type: AttachmentActionType.BUTTON as const,
        label: 'My button',
        iconType: 'download',
        onClick,
      },
    ];

    const result = appMock.render(
      <RegisteredAttachmentsPropertyActions {...props} registeredAttachmentActions={action} />
    );

    expect(result.getByTestId('property-actions-user-action')).toBeInTheDocument();

    userEvent.click(result.getByTestId('property-actions-user-action-ellipses'));
    await waitForEuiPopoverOpen();

    expect(result.getByTestId('property-actions-user-action-group').children.length).toBe(2);
    expect(result.queryByTestId('property-actions-user-action-download')).toBeInTheDocument();
  });
});
