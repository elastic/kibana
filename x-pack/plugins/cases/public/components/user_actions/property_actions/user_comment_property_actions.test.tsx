/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { waitFor } from '@testing-library/react';
import { waitForEuiPopoverOpen, screen } from '@elastic/eui/lib/test/rtl';
import userEvent from '@testing-library/user-event';
import type { AppMockRenderer } from '../../../common/mock';
import {
  noCasesPermissions,
  onlyDeleteCasesPermission,
  createAppMockRenderer,
} from '../../../common/mock';
import { UserCommentPropertyActions } from './user_comment_property_actions';
import { useLensOpenVisualization } from '../../markdown_editor/plugins/lens/use_lens_open_visualization';
import { useDeletePropertyAction } from './use_delete_property_action';

jest.mock('../../markdown_editor/plugins/lens/use_lens_open_visualization');
jest.mock('./use_delete_property_action');

describe('UserCommentPropertyActions', () => {
  let appMock: AppMockRenderer;
  const useDeletePropertyActionMock = useDeletePropertyAction as jest.Mock;
  const useLensOpenVisualizationMock = useLensOpenVisualization as jest.Mock;
  const onConfirmMock = jest.fn();

  const props = {
    isLoading: false,
    onEdit: jest.fn(),
    onQuote: jest.fn(),
    onDelete: jest.fn(),
  };

  beforeEach(() => {
    appMock = createAppMockRenderer();
    jest.clearAllMocks();
    useDeletePropertyActionMock.mockReturnValue({
      showDeletionModal: true,
      onModalOpen: jest.fn(),
      onConfirm: onConfirmMock,
      onCancel: jest.fn(),
    });
    useLensOpenVisualizationMock.mockReturnValue({
      canUseEditor: false,
      actionConfig: {},
    });
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
    expect(onConfirmMock).toHaveBeenCalled();
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
