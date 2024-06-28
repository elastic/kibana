/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { waitForEuiPopoverOpen, screen } from '@elastic/eui/lib/test/rtl';
import userEvent from '@testing-library/user-event';
import type { AppMockRenderer } from '../../../common/mock';
import {
  noCasesPermissions,
  onlyDeleteCasesPermission,
  createAppMockRenderer,
} from '../../../common/mock';
import { UserCommentPropertyActions } from './user_comment_property_actions';
import { waitFor } from '@testing-library/react';

describe('UserCommentPropertyActions', () => {
  let appMock: AppMockRenderer;

  const props = {
    isLoading: false,
    onEdit: jest.fn(),
    onQuote: jest.fn(),
    onDelete: jest.fn(),
  };

  beforeEach(() => {
    appMock = createAppMockRenderer();
    jest.clearAllMocks();
  });

  it('renders the correct number of actions', async () => {
    appMock.render(<UserCommentPropertyActions {...props} />);

    expect(await screen.findByTestId('property-actions-user-action')).toBeInTheDocument();

    userEvent.click(await screen.findByTestId('property-actions-user-action-ellipses'));
    await waitForEuiPopoverOpen();

    expect((await screen.findByTestId('property-actions-user-action-group')).children.length).toBe(
      3
    );
    expect(screen.queryByTestId('property-actions-user-action-pencil')).toBeInTheDocument();
    expect(screen.queryByTestId('property-actions-user-action-trash')).toBeInTheDocument();
    expect(screen.queryByTestId('property-actions-user-action-quote')).toBeInTheDocument();
  });

  it('edits the comment correctly', async () => {
    appMock.render(<UserCommentPropertyActions {...props} />);

    expect(await screen.findByTestId('property-actions-user-action')).toBeInTheDocument();

    userEvent.click(await screen.findByTestId('property-actions-user-action-ellipses'));
    await waitForEuiPopoverOpen();

    expect(screen.queryByTestId('property-actions-user-action-pencil')).toBeInTheDocument();

    userEvent.click(await screen.findByTestId('property-actions-user-action-pencil'));

    expect(props.onEdit).toHaveBeenCalled();
  });

  it('quotes the comment correctly', async () => {
    appMock.render(<UserCommentPropertyActions {...props} />);

    expect(await screen.findByTestId('property-actions-user-action')).toBeInTheDocument();

    userEvent.click(await screen.findByTestId('property-actions-user-action-ellipses'));
    await waitForEuiPopoverOpen();

    expect(screen.queryByTestId('property-actions-user-action-quote')).toBeInTheDocument();

    userEvent.click(await screen.findByTestId('property-actions-user-action-quote'));

    expect(props.onQuote).toHaveBeenCalled();
  });

  it('deletes the comment correctly', async () => {
    appMock.render(<UserCommentPropertyActions {...props} />);

    expect(await screen.findByTestId('property-actions-user-action')).toBeInTheDocument();

    userEvent.click(await screen.findByTestId('property-actions-user-action-ellipses'));
    await waitForEuiPopoverOpen();

    expect(screen.queryByTestId('property-actions-user-action-trash')).toBeInTheDocument();

    userEvent.click(await screen.findByTestId('property-actions-user-action-trash'));

    await waitFor(() => {
      expect(screen.queryByTestId('property-actions-confirm-modal')).toBeInTheDocument();
    });

    userEvent.click(await screen.findByText('Delete'));
    expect(props.onDelete).toHaveBeenCalled();
  });

  it('does not show the property actions without delete permissions', async () => {
    appMock = createAppMockRenderer({ permissions: noCasesPermissions() });
    appMock.render(<UserCommentPropertyActions {...props} />);

    expect(screen.queryByTestId('property-actions-user-action')).not.toBeInTheDocument();
  });

  it('does show the property actions with only delete permissions', async () => {
    appMock = createAppMockRenderer({ permissions: onlyDeleteCasesPermission() });
    appMock.render(<UserCommentPropertyActions {...props} />);

    expect(await screen.findByTestId('property-actions-user-action')).toBeInTheDocument();
  });
});
