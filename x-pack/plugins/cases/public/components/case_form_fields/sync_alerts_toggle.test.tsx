/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { screen, within, waitFor, render } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SyncAlertsToggle } from './sync_alerts_toggle';
import { schema } from '../create/schema';
import { FormTestComponent } from '../../common/test_utils';

describe('SyncAlertsToggle', () => {
  const onSubmit = jest.fn();
  const defaultFormProps = {
    onSubmit,
    formDefaultValue: { syncAlerts: true },
    schema: {
      syncAlerts: schema.syncAlerts,
    },
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('it renders', async () => {
    render(
      <FormTestComponent>
        <SyncAlertsToggle isLoading={false} />
      </FormTestComponent>
    );

    expect(await screen.findByTestId('caseSyncAlerts')).toBeInTheDocument();
    expect(await screen.findByRole('switch')).toHaveAttribute('aria-checked', 'true');
    expect(await screen.findByText('On')).toBeInTheDocument();
  });

  it('it toggles the switch', async () => {
    render(
      <FormTestComponent>
        <SyncAlertsToggle isLoading={false} />
      </FormTestComponent>
    );

    const synAlerts = await screen.findByTestId('caseSyncAlerts');

    await userEvent.click(within(synAlerts).getByRole('switch'));

    expect(await screen.findByRole('switch')).toHaveAttribute('aria-checked', 'false');
    expect(await screen.findByText('Off')).toBeInTheDocument();
  });

  it('calls onSubmit with correct data', async () => {
    render(
      <FormTestComponent {...defaultFormProps}>
        <SyncAlertsToggle isLoading={false} />
      </FormTestComponent>
    );

    const synAlerts = await screen.findByTestId('caseSyncAlerts');

    await userEvent.click(within(synAlerts).getByRole('switch'));

    await userEvent.click(await screen.findByText('Submit'));

    await waitFor(() => {
      expect(onSubmit).toBeCalledWith(
        {
          syncAlerts: false,
        },
        true
      );
    });
  });
});
