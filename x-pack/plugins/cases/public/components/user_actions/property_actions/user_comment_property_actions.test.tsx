/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { waitForEuiPopoverOpen } from '@elastic/eui/lib/test/rtl';
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
    const result = appMock.render(<UserCommentPropertyActions {...props} />);

    expect(result.getByTestId('property-actions')).toBeInTheDocument();

    userEvent.click(result.getByTestId('property-actions-ellipses'));
    await waitForEuiPopoverOpen();

    expect(result.getByTestId('property-actions-group').children.length).toBe(3);
    expect(result.queryByTestId('property-actions-pencil')).toBeInTheDocument();
    expect(result.queryByTestId('property-actions-trash')).toBeInTheDocument();
    expect(result.queryByTestId('property-actions-quote')).toBeInTheDocument();
  });

  it('edits the comment correctly', async () => {
    const result = appMock.render(<UserCommentPropertyActions {...props} />);

    expect(result.getByTestId('property-actions')).toBeInTheDocument();

    userEvent.click(result.getByTestId('property-actions-ellipses'));
    await waitForEuiPopoverOpen();

    expect(result.queryByTestId('property-actions-pencil')).toBeInTheDocument();

    userEvent.click(result.getByTestId('property-actions-pencil'));

    expect(props.onEdit).toHaveBeenCalled();
  });

  it('quotes the comment correctly', async () => {
    const result = appMock.render(<UserCommentPropertyActions {...props} />);

    expect(result.getByTestId('property-actions')).toBeInTheDocument();

    userEvent.click(result.getByTestId('property-actions-ellipses'));
    await waitForEuiPopoverOpen();

    expect(result.queryByTestId('property-actions-quote')).toBeInTheDocument();

    userEvent.click(result.getByTestId('property-actions-quote'));

    expect(props.onQuote).toHaveBeenCalled();
  });

  it('deletes the comment correctly', async () => {
    const result = appMock.render(<UserCommentPropertyActions {...props} />);

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

  it('does not show the property actions without delete permissions', async () => {
    appMock = createAppMockRenderer({ permissions: noCasesPermissions() });
    const result = appMock.render(<UserCommentPropertyActions {...props} />);

    expect(result.queryByTestId('property-actions')).not.toBeInTheDocument();
  });

  it('does show the property actions with only delete permissions', async () => {
    appMock = createAppMockRenderer({ permissions: onlyDeleteCasesPermission() });
    const result = appMock.render(<UserCommentPropertyActions {...props} />);

    expect(result.getByTestId('property-actions')).toBeInTheDocument();
  });
});
