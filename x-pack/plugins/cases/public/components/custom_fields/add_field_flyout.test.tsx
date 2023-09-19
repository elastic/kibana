/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import type { AppMockRenderer } from '../../common/mock';
import { createAppMockRenderer } from '../../common/mock';
import { AddFieldFlyout } from './add_field_flyout';

describe('AddFieldFlyout ', () => {
  let appMockRender: AppMockRenderer;

  const props = {
    onCloseFlyout: jest.fn(),
    onSaveField: jest.fn(),
    isLoading: false,
    disabled: false,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    appMockRender = createAppMockRenderer();
  });

  it('renders correctly', async () => {
    appMockRender.render(<AddFieldFlyout {...props} />);

    expect(screen.getByTestId('add-custom-field-flyout-header')).toBeInTheDocument();
    expect(screen.getByTestId('add-custom-field-flyout-cancel')).toBeInTheDocument();
    expect(screen.getByTestId('add-custom-field-flyout-save')).toBeInTheDocument();
  });

  it('calls onSaveField on save field', async () => {
    appMockRender.render(<AddFieldFlyout {...props} />);

    userEvent.paste(screen.getByTestId('custom-field-label-input'), 'Summary');

    userEvent.click(screen.getByTestId('text-custom-field-options'));

    userEvent.click(screen.getByTestId('add-custom-field-flyout-save'));

    await waitFor(() => {
      expect(props.onSaveField).toBeCalledWith([
        {
          key: expect.anything(),
          label: 'Summary',
          required: true,
          type: 'text',
        },
      ]);
    });
  });

  it('does not call onSaveField when error', async () => {
    appMockRender.render(<AddFieldFlyout {...props} />);

    userEvent.click(screen.getByTestId('add-custom-field-flyout-save'));

    expect(props.onSaveField).not.toBeCalled();
  });

  it('calls onCloseFlyout on cancel', async () => {
    appMockRender.render(<AddFieldFlyout {...props} />);

    userEvent.click(screen.getByTestId('add-custom-field-flyout-cancel'));

    await waitFor(() => {
      expect(props.onCloseFlyout).toBeCalled();
    });
  });

  it('calls onCloseFlyout on close', async () => {
    appMockRender.render(<AddFieldFlyout {...props} />);

    userEvent.click(screen.getByTestId('euiFlyoutCloseButton'));

    await waitFor(() => {
      expect(props.onCloseFlyout).toBeCalled();
    });
  });
});
