/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { I18nProvider } from '@kbn/i18n-react';
import { StatusHeaderBanner } from './status_header_banner';

const renderWithIntl = (ui: React.ReactElement) => {
  return render(<I18nProvider>{ui}</I18nProvider>);
};

describe('StatusHeaderBanner', () => {
  describe('critical variant (default)', () => {
    it('mirrors the StatusHeader default critical title and description', () => {
      renderWithIntl(<StatusHeaderBanner />);

      // These defaults must stay in lockstep with `StatusHeader` so the sticky
      // banner reflects whatever the centered status header shows.
      expect(screen.getByText('Your system requires attention')).toBeInTheDocument();
      expect(
        screen.getByText(
          'We are detecting more unusual behaviour than normal, review the impact and details and start remediation or further actions.'
        )
      ).toBeInTheDocument();
    });

    it('renders custom title and description when provided', () => {
      renderWithIntl(
        <StatusHeaderBanner
          title="Critical: payment failures"
          description="Impacting: payment, checkout"
        />
      );

      expect(screen.getByText('Critical: payment failures')).toBeInTheDocument();
      expect(screen.getByText('Impacting: payment, checkout')).toBeInTheDocument();
    });
  });

  describe('noCriticalEvents variant', () => {
    it('mirrors the StatusHeader default no-critical title and description', () => {
      renderWithIntl(<StatusHeaderBanner variant="noCriticalEvents" />);

      expect(screen.getByText('You have no critical significant events')).toBeInTheDocument();
      expect(
        screen.getByText(
          'Here are some low and medium severity suggestions of significant events we recommend reviewing.'
        )
      ).toBeInTheDocument();
    });
  });

  describe('optional timestamp and menu', () => {
    it('renders the timestamp when provided', () => {
      renderWithIntl(<StatusHeaderBanner timestamp="(5 minutes ago)" />);
      expect(screen.getByText('(5 minutes ago)')).toBeInTheDocument();
    });

    it('renders the menu button only when onMenuClick is provided', () => {
      const handleMenuClick = jest.fn();
      const { rerender } = renderWithIntl(<StatusHeaderBanner />);
      expect(screen.queryByLabelText('More options')).not.toBeInTheDocument();

      rerender(
        <I18nProvider>
          <StatusHeaderBanner onMenuClick={handleMenuClick} />
        </I18nProvider>
      );

      const menuButton = screen.getByLabelText('More options');
      expect(menuButton).toBeInTheDocument();

      fireEvent.click(menuButton);
      expect(handleMenuClick).toHaveBeenCalledTimes(1);
    });
  });

  it('uses the default test subject for the wrapper', () => {
    renderWithIntl(<StatusHeaderBanner />);
    expect(screen.getByTestId('sigeventsOverviewStatusHeaderBanner')).toBeInTheDocument();
  });

  it('respects a custom data-test-subj', () => {
    renderWithIntl(<StatusHeaderBanner data-test-subj="customBanner" />);
    expect(screen.getByTestId('customBanner')).toBeInTheDocument();
  });
});
