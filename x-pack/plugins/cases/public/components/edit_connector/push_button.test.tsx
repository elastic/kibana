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
import { PushButton } from './push_button';

const pushToService = jest.fn();

const defaultProps = {
  disabled: false,
  isLoading: false,
  errorsMsg: [],
  hasBeenPushed: false,
  showTooltip: false,
  connectorName: 'My SN connector',
  pushToService,
};

describe('PushButton ', () => {
  let appMockRender: AppMockRenderer;

  beforeEach(() => {
    jest.clearAllMocks();
    appMockRender = createAppMockRenderer();
  });

  it('renders the button without tooltip', async () => {
    appMockRender.render(<PushButton {...defaultProps} />);

    expect(await screen.findByTestId('push-to-external-service')).toBeInTheDocument();
    expect(screen.queryByTestId('push-button-tooltip')).not.toBeInTheDocument();
  });

  it('renders the correct label when the connector has not been pushed', async () => {
    appMockRender.render(<PushButton {...defaultProps} />);

    expect(await screen.findByText('Push as My SN connector incident')).toBeInTheDocument();
  });

  it('renders the correct label when the connector has been pushed', async () => {
    appMockRender.render(<PushButton {...defaultProps} hasBeenPushed={true} />);

    expect(await screen.findByText('Update My SN connector incident')).toBeInTheDocument();
  });

  it('pushed correctly', async () => {
    appMockRender.render(<PushButton {...defaultProps} />);

    userEvent.click(await screen.findByTestId('push-to-external-service'));

    await waitFor(() => {
      expect(pushToService).toHaveBeenCalled();
    });
  });

  it('disables the button', async () => {
    appMockRender.render(<PushButton {...defaultProps} disabled={true} />);

    expect(await screen.findByTestId('push-to-external-service')).toBeDisabled();
  });

  it('shows the tooltip context correctly', async () => {
    appMockRender.render(<PushButton {...defaultProps} showTooltip={true} />);

    userEvent.hover(await screen.findByTestId('push-to-external-service'));

    expect(await screen.findByText('My SN connector incident is up to date')).toBeInTheDocument();
    expect(await screen.findByText('No update is required')).toBeInTheDocument();
  });

  it('shows the tooltip context correctly with custom message', async () => {
    appMockRender.render(
      <PushButton
        {...defaultProps}
        showTooltip={true}
        errorsMsg={[{ id: 'test-id', title: 'My title', description: 'My desc' }]}
      />
    );

    userEvent.hover(await screen.findByTestId('push-to-external-service'));

    expect(await screen.findByText('My title')).toBeInTheDocument();
    expect(await screen.findByText('My desc')).toBeInTheDocument();
  });
});
