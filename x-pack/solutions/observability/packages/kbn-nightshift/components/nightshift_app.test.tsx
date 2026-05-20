/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { EuiThemeProvider } from '@elastic/eui';
import { NightshiftApp } from './nightshift_app';

describe('NightshiftApp', () => {
  it('renders the title and coming soon text', () => {
    render(
      <EuiThemeProvider colorMode="light">
        <NightshiftApp />
      </EuiThemeProvider>
    );

    expect(screen.getByTestId('nightshiftEmptyState')).toBeInTheDocument();
    expect(screen.getByText('Nightshift')).toBeInTheDocument();
    expect(screen.getByText('Coming soon')).toBeInTheDocument();
  });
});
