/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useExpandableFlyoutApi } from '@kbn/expandable-flyout';
import { fireEvent, render, screen } from '@testing-library/react';
import React from 'react';

import { TestProviders } from '../../../common/mock';
import { getFieldMarkdownRenderer } from '.';

jest.mock('@kbn/expandable-flyout', () => ({
  useExpandableFlyoutApi: jest.fn(),
}));

describe('getFieldMarkdownRenderer', () => {
  const mockOpenRightPanel = jest.fn();
  const mockUseExpandableFlyoutApi = useExpandableFlyoutApi as jest.MockedFunction<
    typeof useExpandableFlyoutApi
  >;

  beforeEach(() => {
    jest.clearAllMocks();

    mockUseExpandableFlyoutApi.mockReturnValue({
      closeFlyout: jest.fn(),
      closeLeftPanel: jest.fn(),
      closePreviewPanel: jest.fn(),
      closeRightPanel: jest.fn(),
      previousPreviewPanel: jest.fn(),
      openFlyout: jest.fn(),
      openLeftPanel: jest.fn(),
      openPreviewPanel: jest.fn(),
      openRightPanel: mockOpenRightPanel,
    });
  });

  it('renders the field value', () => {
    const FieldMarkdownRenderer = getFieldMarkdownRenderer(false);
    const icon = '';
    const name = 'some.field';
    const value = 'some.value';

    render(
      <TestProviders>
        <FieldMarkdownRenderer icon={icon} name={name} operator={':'} value={value} />
      </TestProviders>
    );

    const fieldValue = screen.getByText(value);

    expect(fieldValue).toBeInTheDocument();
  });

  it('opens the right panel when the entity button is clicked', () => {
    const FieldMarkdownRenderer = getFieldMarkdownRenderer(false);
    const icon = 'user';
    const name = 'user.name';
    const value = 'some.user';

    render(
      <TestProviders>
        <FieldMarkdownRenderer icon={icon} name={name} operator={':'} value={value} />
      </TestProviders>
    );

    const entityButton = screen.getByTestId('entityButton');

    fireEvent.click(entityButton);

    expect(mockOpenRightPanel).toHaveBeenCalledTimes(1);
  });

  it('does NOT render the entity button when flyoutPanelProps is null', () => {
    const FieldMarkdownRenderer = getFieldMarkdownRenderer(false);
    const icon = '';
    const name = 'some.field';
    const value = 'some.value';

    render(
      <TestProviders>
        <FieldMarkdownRenderer icon={icon} name={name} operator={':'} value={value} />
      </TestProviders>
    );

    const entityButton = screen.queryByTestId('entityButton');

    expect(entityButton).not.toBeInTheDocument();
  });

  it('renders disabled actions badge when disableActions is true', () => {
    const FieldMarkdownRenderer = getFieldMarkdownRenderer(true); // disable actions
    const icon = 'user';
    const name = 'user.name';
    const value = 'some.user';

    render(
      <TestProviders>
        <FieldMarkdownRenderer icon={icon} name={name} operator={':'} value={value} />
      </TestProviders>
    );

    const disabledActionsBadge = screen.getByTestId('disabledActionsBadge');

    expect(disabledActionsBadge).toBeInTheDocument();
  });
});
