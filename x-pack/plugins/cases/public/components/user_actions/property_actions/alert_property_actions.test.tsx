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
import { AlertPropertyActions } from './alert_property_actions';

describe('AlertPropertyActions', () => {
  let appMock: AppMockRenderer;

  const props = {
    isLoading: false,
    totalAlerts: 1,
    onDelete: jest.fn(),
  };

  beforeEach(() => {
    appMock = createAppMockRenderer();
    jest.clearAllMocks();
  });

  it('renders the correct number of actions', async () => {
    const result = appMock.render(<AlertPropertyActions {...props} />);

    expect(result.getByTestId('property-actions')).toBeInTheDocument();

    userEvent.click(result.getByTestId('property-actions-ellipses'));
    await waitForEuiPopoverOpen();

    expect(result.getByTestId('property-actions-group').children.length).toBe(1);
    expect(result.queryByTestId('property-actions-minusInCircle')).toBeInTheDocument();
  });

  it('renders the modal info correctly for one alert', async () => {
    const result = appMock.render(<AlertPropertyActions {...props} />);

    expect(result.getByTestId('property-actions')).toBeInTheDocument();

    userEvent.click(result.getByTestId('property-actions-ellipses'));
    await waitForEuiPopoverOpen();

    expect(result.queryByTestId('property-actions-minusInCircle')).toBeInTheDocument();

    userEvent.click(result.getByTestId('property-actions-minusInCircle'));

    await waitFor(() => {
      expect(result.queryByTestId('property-actions-confirm-modal')).toBeInTheDocument();
    });

    expect(result.getByTestId('confirmModalTitleText')).toHaveTextContent('Remove alert');
    expect(result.getByText('Remove')).toBeInTheDocument();
  });

  it('renders the modal info correctly for multiple alert', async () => {
    const result = appMock.render(<AlertPropertyActions {...props} totalAlerts={2} />);

    expect(result.getByTestId('property-actions')).toBeInTheDocument();

    userEvent.click(result.getByTestId('property-actions-ellipses'));
    await waitForEuiPopoverOpen();

    expect(result.queryByTestId('property-actions-minusInCircle')).toBeInTheDocument();

    userEvent.click(result.getByTestId('property-actions-minusInCircle'));

    await waitFor(() => {
      expect(result.queryByTestId('property-actions-confirm-modal')).toBeInTheDocument();
    });

    expect(result.getByTestId('confirmModalTitleText')).toHaveTextContent('Remove alerts');
    expect(result.getByText('Remove')).toBeInTheDocument();
  });

  it('remove alerts correctly', async () => {
    const result = appMock.render(<AlertPropertyActions {...props} />);

    expect(result.getByTestId('property-actions')).toBeInTheDocument();

    userEvent.click(result.getByTestId('property-actions-ellipses'));
    await waitForEuiPopoverOpen();

    expect(result.queryByTestId('property-actions-minusInCircle')).toBeInTheDocument();

    userEvent.click(result.getByTestId('property-actions-minusInCircle'));

    await waitFor(() => {
      expect(result.queryByTestId('property-actions-confirm-modal')).toBeInTheDocument();
    });

    userEvent.click(result.getByText('Remove'));
    expect(props.onDelete).toHaveBeenCalled();
  });

  it('does not show the property actions without delete permissions', async () => {
    appMock = createAppMockRenderer({ permissions: noCasesPermissions() });
    const result = appMock.render(<AlertPropertyActions {...props} />);

    expect(result.queryByTestId('property-actions')).not.toBeInTheDocument();
  });

  it('does show the property actions with only delete permissions', async () => {
    appMock = createAppMockRenderer({ permissions: onlyDeleteCasesPermission() });
    const result = appMock.render(<AlertPropertyActions {...props} />);

    expect(result.getByTestId('property-actions')).toBeInTheDocument();
  });
});
