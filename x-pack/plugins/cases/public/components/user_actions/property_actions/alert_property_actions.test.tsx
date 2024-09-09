/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { waitForEuiPopoverOpen } from '@elastic/eui/lib/test/rtl';
import { waitFor, screen } from '@testing-library/react';
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
    jest.clearAllMocks();
    appMock = createAppMockRenderer();
  });

  afterEach(async () => {
    await appMock.clearQueryCache();
  });

  it('renders the correct number of actions', async () => {
    appMock.render(<AlertPropertyActions {...props} />);

    expect(await screen.findByTestId('property-actions-user-action')).toBeInTheDocument();

    userEvent.click(await screen.findByTestId('property-actions-user-action-ellipses'));
    await waitForEuiPopoverOpen();

    expect((await screen.findByTestId('property-actions-user-action-group')).children.length).toBe(
      1
    );

    expect(
      await screen.findByTestId('property-actions-user-action-minusInCircle')
    ).toBeInTheDocument();
  });

  it('renders the modal info correctly for multiple alert', async () => {
    appMock.render(<AlertPropertyActions {...props} totalAlerts={2} />);

    expect(await screen.findByTestId('property-actions-user-action')).toBeInTheDocument();

    userEvent.click(await screen.findByTestId('property-actions-user-action-ellipses'));
    await waitForEuiPopoverOpen();

    userEvent.click(await screen.findByTestId('property-actions-user-action-minusInCircle'));

    expect(await screen.findByTestId('property-actions-confirm-modal')).toBeInTheDocument();

    expect(await screen.findByTestId('confirmModalTitleText')).toHaveTextContent('Remove alerts');
    expect(await screen.findByText('Remove')).toBeInTheDocument();
  });

  it('remove alerts correctly', async () => {
    appMock.render(<AlertPropertyActions {...props} />);

    expect(await screen.findByTestId('property-actions-user-action')).toBeInTheDocument();

    userEvent.click(await screen.findByTestId('property-actions-user-action-ellipses'));
    await waitForEuiPopoverOpen();

    userEvent.click(await screen.findByTestId('property-actions-user-action-minusInCircle'));

    expect(await screen.findByTestId('property-actions-confirm-modal')).toBeInTheDocument();

    userEvent.click(await screen.findByText('Remove'));

    await waitFor(() => {
      expect(props.onDelete).toHaveBeenCalled();
    });
  });

  it('does not show the property actions without delete permissions', async () => {
    appMock = createAppMockRenderer({ permissions: noCasesPermissions() });
    appMock.render(<AlertPropertyActions {...props} />);

    expect(screen.queryByTestId('property-actions-user-action')).not.toBeInTheDocument();
  });

  it('does show the property actions with only delete permissions', async () => {
    appMock = createAppMockRenderer({ permissions: onlyDeleteCasesPermission() });
    appMock.render(<AlertPropertyActions {...props} />);

    expect(await screen.findByTestId('property-actions-user-action')).toBeInTheDocument();
  });
});
