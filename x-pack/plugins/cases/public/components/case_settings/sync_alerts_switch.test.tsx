/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { AppMockRenderer } from '../../common/mock';
import { createAppMockRenderer } from '../../common/mock';

import { SyncAlertsSwitch } from './sync_alerts_switch';

describe('SyncAlertsSwitch', () => {
  let appMockRender: AppMockRenderer;

  beforeEach(() => {
    appMockRender = createAppMockRenderer();
  });

  it('it renders', async () => {
    appMockRender.render(<SyncAlertsSwitch disabled={false} />);

    expect(await screen.findByTestId('sync-alerts-switch')).toBeInTheDocument();
  });

  it('it toggles the switch', async () => {
    appMockRender.render(<SyncAlertsSwitch disabled={false} />);

    await userEvent.click(await screen.findByTestId('sync-alerts-switch'));

    expect(await screen.findByTestId('sync-alerts-switch')).toHaveAttribute(
      'aria-checked',
      'false'
    );
  });

  it('it disables the switch', async () => {
    appMockRender.render(<SyncAlertsSwitch disabled={true} />);

    expect(await screen.findByTestId('sync-alerts-switch')).toHaveProperty('disabled', true);
  });

  it('it start as off', async () => {
    appMockRender.render(<SyncAlertsSwitch disabled={false} isSynced={false} showLabel={true} />);

    expect(await screen.findByText('Off')).toBeInTheDocument();
    expect(screen.queryByText('On')).not.toBeInTheDocument();
  });

  it('it shows the correct labels', async () => {
    appMockRender.render(<SyncAlertsSwitch disabled={false} showLabel={true} />);

    expect(await screen.findByText('On')).toBeInTheDocument();
    expect(screen.queryByText('Off')).not.toBeInTheDocument();

    await userEvent.click(await screen.findByTestId('sync-alerts-switch'));

    expect(await screen.findByText('Off')).toBeInTheDocument();
    expect(screen.queryByText('On')).not.toBeInTheDocument();
  });
});
