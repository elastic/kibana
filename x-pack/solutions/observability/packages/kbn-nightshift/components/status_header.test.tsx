/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { I18nProvider } from '@kbn/i18n-react';
import { StatusHeader } from './status_header';

const renderWithIntl = (ui: React.ReactElement) => {
  return render(<I18nProvider>{ui}</I18nProvider>);
};

describe('StatusHeader', () => {
  describe('critical variant (default)', () => {
    it('renders the default title and description', () => {
      renderWithIntl(<StatusHeader />);

      expect(screen.getByText('Your system requires attention')).toBeInTheDocument();
      expect(
        screen.getByText(
          'We are detecting more unusual behaviour than normal, review the impact and details and start remediation or further actions.'
        )
      ).toBeInTheDocument();
    });

    it('renders custom title and description when provided', () => {
      renderWithIntl(
        <StatusHeader
          title="Custom system title"
          description="Custom description for the system status"
        />
      );

      expect(screen.getByText('Custom system title')).toBeInTheDocument();
      expect(screen.getByText('Custom description for the system status')).toBeInTheDocument();
    });
  });

  describe('noCriticalEvents variant', () => {
    it('renders the no-critical default title and description', () => {
      renderWithIntl(<StatusHeader variant="noCriticalEvents" />);

      expect(screen.getByText('You have no critical significant events')).toBeInTheDocument();
      expect(
        screen.getByText(
          'Here are some low and medium severity suggestions of significant events we recommend reviewing.'
        )
      ).toBeInTheDocument();
    });
  });

  it('never renders a mode badge', () => {
    renderWithIntl(<StatusHeader />);
    expect(screen.queryByText('SIGNIFICANT EVENTS')).not.toBeInTheDocument();
  });

  it('has the correct test subject', () => {
    renderWithIntl(<StatusHeader />);
    expect(screen.getByTestId('sigeventsOverviewStatusHeader')).toBeInTheDocument();
  });
});
