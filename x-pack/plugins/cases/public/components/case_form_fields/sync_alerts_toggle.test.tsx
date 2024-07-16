/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { screen, within, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SyncAlertsToggle } from './sync_alerts_toggle';
import { schema } from '../create/schema';
import { FormTestComponent } from '../../common/test_utils';
import type { AppMockRenderer } from '../../common/mock';
import { createAppMockRenderer } from '../../common/mock';

describe('SyncAlertsToggle', () => {
  let appMockRender: AppMockRenderer;
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
    appMockRender = createAppMockRenderer();
  });

  it('it renders', async () => {
    appMockRender.render(
      <FormTestComponent>
        <SyncAlertsToggle isLoading={false} />
      </FormTestComponent>
    );

    expect(await screen.findByTestId('caseSyncAlerts')).toBeInTheDocument();
    expect(await screen.findByRole('switch')).toHaveAttribute('aria-checked', 'true');
    expect(await screen.findByText('On')).toBeInTheDocument();
  });

  it('it toggles the switch', async () => {
    appMockRender.render(
      <FormTestComponent>
        <SyncAlertsToggle isLoading={false} />
      </FormTestComponent>
    );

    const synAlerts = await screen.findByTestId('caseSyncAlerts');

    userEvent.click(within(synAlerts).getByRole('switch'));

    expect(await screen.findByRole('switch')).toHaveAttribute('aria-checked', 'false');
    expect(await screen.findByText('Off')).toBeInTheDocument();
  });

  it('calls onSubmit with correct data', async () => {
    appMockRender.render(
      <FormTestComponent {...defaultFormProps}>
        <SyncAlertsToggle isLoading={false} />
      </FormTestComponent>
    );

    const synAlerts = await screen.findByTestId('caseSyncAlerts');

    userEvent.click(within(synAlerts).getByRole('switch'));

    userEvent.click(screen.getByText('Submit'));

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
