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
import { createAppMockRenderer, noCasesPermissions } from '../../../common/mock';
import { DescriptionPropertyActions } from './description_property_actions';

describe('DescriptionPropertyActions', () => {
  let appMock: AppMockRenderer;

  const props = {
    isLoading: false,
    onEdit: jest.fn(),
    onQuote: jest.fn(),
  };

  beforeEach(() => {
    appMock = createAppMockRenderer();
    jest.clearAllMocks();
  });

  it('renders the correct number of actions', async () => {
    const result = appMock.render(<DescriptionPropertyActions {...props} />);

    expect(result.getByTestId('property-actions-description')).toBeInTheDocument();

    userEvent.click(result.getByTestId('property-actions-description-ellipses'));
    await waitForEuiPopoverOpen();

    expect(result.getByTestId('property-actions-description-group').children.length).toBe(2);
    expect(result.queryByTestId('property-actions-description-pencil')).toBeInTheDocument();
    expect(result.queryByTestId('property-actions-description-quote')).toBeInTheDocument();
  });

  it('edits the description correctly', async () => {
    const result = appMock.render(<DescriptionPropertyActions {...props} />);

    expect(result.getByTestId('property-actions-description')).toBeInTheDocument();

    userEvent.click(result.getByTestId('property-actions-description-ellipses'));
    await waitForEuiPopoverOpen();

    expect(result.queryByTestId('property-actions-description-pencil')).toBeInTheDocument();

    userEvent.click(result.getByTestId('property-actions-description-pencil'));

    expect(props.onEdit).toHaveBeenCalled();
  });

  it('quotes the description correctly', async () => {
    const result = appMock.render(<DescriptionPropertyActions {...props} />);

    expect(result.getByTestId('property-actions-description')).toBeInTheDocument();

    userEvent.click(result.getByTestId('property-actions-description-ellipses'));
    await waitForEuiPopoverOpen();

    expect(result.queryByTestId('property-actions-description-quote')).toBeInTheDocument();

    userEvent.click(result.getByTestId('property-actions-description-quote'));

    expect(props.onQuote).toHaveBeenCalled();
  });

  it('does not show the property actions without permissions', async () => {
    appMock = createAppMockRenderer({ permissions: noCasesPermissions() });
    const result = appMock.render(<DescriptionPropertyActions {...props} />);

    expect(result.queryByTestId('property-actions-description')).not.toBeInTheDocument();
  });
});
