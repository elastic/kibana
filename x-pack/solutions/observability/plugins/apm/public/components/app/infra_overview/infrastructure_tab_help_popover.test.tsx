/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import { renderWithContext } from '../../../utils/test_helpers';
import { InfrastructureTabHelpPopover } from './infrastructure_tab_help_popover';

describe('InfrastructureTabHelpPopover', () => {
  it('shows supported infrastructure guidance with a docs link', async () => {
    renderWithContext(<InfrastructureTabHelpPopover />);

    expect(screen.queryByText('Help')).not.toBeInTheDocument();

    await userEvent.hover(screen.getByTestId('apmHelpPopoverButtonButton'));

    expect(await screen.findByText('Infrastructure tab information')).toBeInTheDocument();

    await userEvent.click(screen.getByTestId('apmHelpPopoverButtonButton'));

    expect(
      screen.getByText(
        'Shows containers, pods, and hosts that the selected service is linked to. The data sources and navigation behavior depend on whether the service is instrumented with Elastic APM or OpenTelemetry (OTel).'
      )
    ).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /documentation/ })).toHaveAttribute(
      'href',
      'https://www.elastic.co/docs/solutions/observability/apm/infrastructure#observability-apm-infrastructure-elastic-apm'
    );
  });
});
