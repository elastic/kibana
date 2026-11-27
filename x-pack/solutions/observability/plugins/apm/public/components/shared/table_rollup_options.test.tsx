/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ReactNode } from 'react';
import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { __IntlProvider as IntlProvider } from '@kbn/i18n-react';
import { RollupInterval } from '@kbn/apm-data-access-plugin/common/rollup';
import { TableRollupOptions } from './table_rollup_options';

// Mock the useApmPluginContext hook
jest.mock('../../context/apm_plugin/use_apm_plugin_context', () => ({
  useApmPluginContext: () => ({
    core: {
      docLinks: {
        links: {
          apm: {
            metrics: 'https://www.elastic.co/guide/en/kibana/current/apm-settings.html',
          },
        },
      },
    },
  }),
}));

function Wrapper({ children }: { children?: ReactNode }) {
  return <IntlProvider locale="en">{children}</IntlProvider>;
}

describe('TableRollupOptions', () => {
  it('renders the rollup options button', () => {
    const mockOnChange = jest.fn();
    render(
      <TableRollupOptions
        rollupInterval={RollupInterval.OneMinute}
        onRollupIntervalChange={mockOnChange}
      />,
      { wrapper: Wrapper }
    );

    expect(screen.getByTestId('apmTableOptionsButton')).toBeInTheDocument();
  });

  it('opens the popover when button is clicked', async () => {
    const mockOnChange = jest.fn();
    const user = userEvent.setup();
    render(
      <TableRollupOptions
        rollupInterval={RollupInterval.OneMinute}
        onRollupIntervalChange={mockOnChange}
      />,
      { wrapper: Wrapper }
    );

    const button = screen.getByTestId('apmTableOptionsButton');
    await user.click(button);

    await waitFor(() => {
      expect(screen.getByText('Rollup interval')).toBeInTheDocument();
    });
  });

  it('calls onRollupIntervalChange when a different rollup option is selected', async () => {
    const mockOnChange = jest.fn();
    const user = userEvent.setup();
    render(
      <TableRollupOptions
        rollupInterval={RollupInterval.OneMinute}
        onRollupIntervalChange={mockOnChange}
      />,
      { wrapper: Wrapper }
    );

    const button = screen.getByTestId('apmTableOptionsButton');
    await user.click(button);

    await waitFor(() => {
      expect(screen.getByText('Rollup interval')).toBeInTheDocument();
    });

    const tenMinutesOption = screen.getByRole('option', { name: /10m/ });
    await user.click(tenMinutesOption);

    expect(mockOnChange).toHaveBeenCalledWith(RollupInterval.TenMinutes);
  });
});
