/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { UserActionPropertyActions, UserActionPropertyActionsProps } from './property_actions';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { waitForEuiPopoverOpen } from '@elastic/eui/lib/test/rtl';
import {
  noCreateCasesPermissions,
  noDeleteCasesPermissions,
  noUpdateCasesPermissions,
  TestProviders,
} from '../../common/mock';

jest.mock('../../common/lib/kibana');

const onEdit = jest.fn();
const onQuote = jest.fn();
const props = {
  commentMarkdown: '',
  id: 'property-actions-id',
  editLabel: 'edit',
  quoteLabel: 'quote',
  disabled: false,
  isLoading: false,
  onEdit,
  onQuote,
};

describe('UserActionPropertyActions ', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders', async () => {
    render(
      <TestProviders>
        <UserActionPropertyActions {...props} />
      </TestProviders>
    );

    expect(screen.queryByTestId('user-action-title-loading')).not.toBeInTheDocument();
    expect(screen.getByTestId('property-actions')).toBeInTheDocument();
  });

  it('shows the edit and quote buttons', async () => {
    const renderResult = render(
      <TestProviders>
        <UserActionPropertyActions {...props} />
      </TestProviders>
    );

    userEvent.click(renderResult.getByTestId('property-actions-ellipses'));
    await waitForEuiPopoverOpen();
    expect(screen.getByTestId('property-actions-pencil')).toBeInTheDocument();
    expect(screen.getByTestId('property-actions-quote')).toBeInTheDocument();
  });

  it('quote click calls onQuote', async () => {
    const renderResult = render(
      <TestProviders>
        <UserActionPropertyActions {...props} />
      </TestProviders>
    );

    userEvent.click(renderResult.getByTestId('property-actions-ellipses'));
    await waitForEuiPopoverOpen();
    userEvent.click(renderResult.getByTestId('property-actions-quote'));

    expect(onQuote).toHaveBeenCalledWith(props.id);
  });

  it('pencil click calls onEdit', async () => {
    const renderResult = render(
      <TestProviders>
        <UserActionPropertyActions {...props} />
      </TestProviders>
    );

    userEvent.click(renderResult.getByTestId('property-actions-ellipses'));
    await waitForEuiPopoverOpen();
    userEvent.click(renderResult.getByTestId('property-actions-pencil'));
    expect(onEdit).toHaveBeenCalledWith(props.id);
  });

  it('shows the spinner when loading', async () => {
    render(
      <TestProviders>
        <UserActionPropertyActions {...props} isLoading={true} />
      </TestProviders>
    );
    expect(screen.getByTestId('user-action-title-loading')).toBeInTheDocument();
    expect(screen.queryByTestId('property-actions')).not.toBeInTheDocument();
  });

  describe('deletion props', () => {
    let onDelete: jest.Mock;
    let deleteProps: UserActionPropertyActionsProps;

    beforeEach(() => {
      jest.clearAllMocks();

      onDelete = jest.fn();
      deleteProps = {
        ...props,
        onDelete,
        deleteLabel: 'delete me',
        deleteConfirmTitle: 'confirm delete me',
      };
    });

    it('does not show the delete icon when the user does not have delete permissions', async () => {
      const renderResult = render(
        <TestProviders permissions={noDeleteCasesPermissions()}>
          <UserActionPropertyActions {...deleteProps} />
        </TestProviders>
      );

      userEvent.click(renderResult.getByTestId('property-actions-ellipses'));
      await waitForEuiPopoverOpen();
      expect(renderResult.queryByTestId('property-actions-trash')).not.toBeInTheDocument();
      expect(renderResult.queryByTestId('property-actions-pencil')).toBeInTheDocument();
      expect(renderResult.queryByTestId('property-actions-quote')).toBeInTheDocument();
    });

    it('does not show the pencil icon when the user does not have update permissions', async () => {
      const renderResult = render(
        <TestProviders permissions={noUpdateCasesPermissions()}>
          <UserActionPropertyActions {...deleteProps} />
        </TestProviders>
      );

      userEvent.click(renderResult.getByTestId('property-actions-ellipses'));
      await waitForEuiPopoverOpen();
      expect(renderResult.queryByTestId('property-actions-trash')).toBeInTheDocument();
      expect(renderResult.queryByTestId('property-actions-pencil')).not.toBeInTheDocument();
      expect(renderResult.queryByTestId('property-actions-quote')).toBeInTheDocument();
    });

    it('does not show the quote icon when the user does not have create permissions', async () => {
      const renderResult = render(
        <TestProviders permissions={noCreateCasesPermissions()}>
          <UserActionPropertyActions {...deleteProps} />
        </TestProviders>
      );

      userEvent.click(renderResult.getByTestId('property-actions-ellipses'));
      await waitForEuiPopoverOpen();
      expect(renderResult.queryByTestId('property-actions-trash')).toBeInTheDocument();
      expect(renderResult.queryByTestId('property-actions-pencil')).toBeInTheDocument();
      expect(renderResult.queryByTestId('property-actions-quote')).not.toBeInTheDocument();
    });

    it('shows the delete button', () => {
      const renderResult = render(
        <TestProviders>
          <UserActionPropertyActions {...deleteProps} />
        </TestProviders>
      );

      userEvent.click(renderResult.getByTestId('property-actions-ellipses'));
      expect(renderResult.getByTestId('property-actions-trash')).toBeTruthy();
    });

    it('shows a confirm dialog when the delete button is clicked', async () => {
      const renderResult = render(
        <TestProviders>
          <UserActionPropertyActions {...deleteProps} />
        </TestProviders>
      );

      userEvent.click(renderResult.getByTestId('property-actions-ellipses'));
      await waitForEuiPopoverOpen();
      userEvent.click(renderResult.getByTestId('property-actions-trash'));

      expect(renderResult.getByTestId('property-actions-confirm-modal')).toBeTruthy();
    });

    it('closes the confirm dialog when the cancel button is clicked', async () => {
      const renderResult = render(
        <TestProviders>
          <UserActionPropertyActions {...deleteProps} />
        </TestProviders>
      );

      userEvent.click(renderResult.getByTestId('property-actions-ellipses'));
      await waitForEuiPopoverOpen();
      userEvent.click(renderResult.getByTestId('property-actions-trash'));
      expect(renderResult.getByTestId('property-actions-confirm-modal')).toBeTruthy();

      userEvent.click(renderResult.getByTestId('confirmModalCancelButton'));
      expect(renderResult.queryByTestId('property-actions-confirm-modal')).toBe(null);
    });

    it('calls onDelete when the confirm is pressed', async () => {
      const renderResult = render(
        <TestProviders>
          <UserActionPropertyActions {...deleteProps} />
        </TestProviders>
      );

      userEvent.click(renderResult.getByTestId('property-actions-ellipses'));
      await waitForEuiPopoverOpen();
      userEvent.click(renderResult.getByTestId('property-actions-trash'));
      expect(renderResult.getByTestId('property-actions-confirm-modal')).toBeTruthy();

      userEvent.click(renderResult.getByTestId('confirmModalConfirmButton'));
      expect(onDelete).toHaveBeenCalledWith(deleteProps.id);
    });
  });
});
