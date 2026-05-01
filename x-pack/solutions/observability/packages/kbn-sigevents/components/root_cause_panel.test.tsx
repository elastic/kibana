/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { I18nProvider } from '@kbn/i18n-react';
import { RootCausePanel, RootCauseCode } from './root_cause_panel';

const renderWithIntl = (ui: React.ReactElement) => render(<I18nProvider>{ui}</I18nProvider>);

describe('RootCausePanel', () => {
  it('renders the default title and illustration', () => {
    renderWithIntl(<RootCausePanel />);

    expect(screen.getByTestId('sigeventsOverviewRootCausePanel')).toBeInTheDocument();
    expect(screen.getByTestId('sigeventsOverviewRootCauseIllustration')).toBeInTheDocument();
    expect(screen.getByText('Root cause')).toBeInTheDocument();
  });

  it('renders the default description', () => {
    renderWithIntl(<RootCausePanel />);
    expect(screen.getByText(/placeOrder/)).toBeInTheDocument();
    expect(screen.getByText(/ECONNREFUSED/)).toBeInTheDocument();
    expect(screen.getByText(/10.103.136.237:9999/)).toBeInTheDocument();
  });

  it('renders a custom title', () => {
    renderWithIntl(<RootCausePanel title="Custom root cause" />);
    expect(screen.getByText('Custom root cause')).toBeInTheDocument();
  });

  it('renders custom children in place of the default description', () => {
    renderWithIntl(
      <RootCausePanel>
        <p>
          Custom root cause with <RootCauseCode>inline code</RootCauseCode> value.
        </p>
      </RootCausePanel>
    );

    expect(screen.getByText(/Custom root cause with/)).toBeInTheDocument();
    expect(screen.getByText('inline code')).toBeInTheDocument();
  });
});
