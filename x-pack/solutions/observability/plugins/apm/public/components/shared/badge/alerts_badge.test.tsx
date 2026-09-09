/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { __IntlProvider as IntlProvider } from '@kbn/i18n-react';
import { AlertsBadge } from './alerts_badge';

function renderBadge(props: React.ComponentProps<typeof AlertsBadge>) {
  return render(
    <IntlProvider locale="en">
      <AlertsBadge {...props} />
    </IntlProvider>
  );
}

describe('AlertsBadge', () => {
  it('renders the count', () => {
    renderBadge({ count: 4, serviceName: 'svc' });
    expect(screen.getByTestId('apmAlertsBadge')).toHaveTextContent('4');
  });

  it('uses a custom data-test-subj when provided', () => {
    renderBadge({ count: 1, serviceName: 'svc', 'data-test-subj': 'customBadge' });
    expect(screen.getByTestId('customBadge')).toBeInTheDocument();
  });

  it('renders an interactive button that fires onClick', () => {
    const onClick = jest.fn();
    renderBadge({ count: 2, serviceName: 'svc', onClick });

    const badge = screen.getByTestId('apmAlertsBadge');
    expect(badge.tagName.toLowerCase()).toBe('button');

    fireEvent.click(badge);
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('renders a focusable, non-interactive badge when no onClick or navigationProps is provided', () => {
    renderBadge({ count: 2, serviceName: 'svc' });

    const badge = screen.getByTestId('apmAlertsBadge');
    expect(badge.tagName.toLowerCase()).not.toBe('button');
    // Tooltip anchor wrapper must be focusable for accessibility.
    expect(badge.closest('span[tabindex="0"]')).not.toBeNull();
  });

  it('does not wrap in a focusable tooltip anchor when hideTooltip is set', () => {
    renderBadge({ count: 5, serviceName: 'svc', hideTooltip: true });

    const badge = screen.getByTestId('apmAlertsBadge');
    expect(badge.closest('span[tabindex="0"]')).toBeNull();
  });

  it('sets data-ebt-* attributes when ebt is provided with onClick', () => {
    renderBadge({
      count: 1,
      serviceName: 'svc',
      onClick: jest.fn(),
      ebt: { action: 'viewAlerts', element: 'serviceFlyoutAlertsBadge' },
    });

    const badge = screen.getByTestId('apmAlertsBadge');
    expect(badge).toHaveAttribute('data-ebt-action', 'viewAlerts');
    expect(badge).toHaveAttribute('data-ebt-element', 'serviceFlyoutAlertsBadge');
  });

  it('does not set data-ebt-* attributes when ebt is provided without onClick or navigationProps', () => {
    renderBadge({
      count: 1,
      serviceName: 'svc',
      ebt: { action: 'viewAlerts', element: 'serviceFlyoutAlertsBadge' },
    });

    const badge = screen.getByTestId('apmAlertsBadge');
    expect(badge).not.toHaveAttribute('data-ebt-action');
  });

  describe('navigationProps', () => {
    function makeNavigationProps(
      getRedirectUrl = jest.fn().mockReturnValue('/app/apm/services/svc/alerts')
    ) {
      return {
        navigationProps: {
          serviceName: 'svc',
          agentName: 'java' as const,
          environment: 'production' as const,
          rangeFrom: 'now-15m',
          rangeTo: 'now',
          locators: { get: jest.fn().mockReturnValue({ getRedirectUrl }) } as any,
        },
        getRedirectUrl,
      };
    }

    it('renders as a link with the href returned by the locator', () => {
      const { navigationProps } = makeNavigationProps();
      renderBadge({ count: 3, serviceName: 'svc', navigationProps });

      const badge = screen.getByTestId('apmAlertsBadge');
      expect(badge.tagName.toLowerCase()).toBe('a');
      expect(badge).toHaveAttribute('href', '/app/apm/services/svc/alerts');
    });

    it('calls the locator with serviceOverviewTab alerts and the given params', () => {
      const { navigationProps, getRedirectUrl } = makeNavigationProps();
      renderBadge({ count: 3, serviceName: 'svc', navigationProps });

      expect(getRedirectUrl).toHaveBeenCalledWith(
        expect.objectContaining({
          serviceName: 'svc',
          serviceOverviewTab: 'alerts',
          query: expect.objectContaining({
            environment: 'production',
            rangeFrom: 'now-15m',
            rangeTo: 'now',
          }),
        })
      );
    });

    it('sets data-ebt-* attributes when ebt is provided alongside navigationProps', () => {
      const { navigationProps } = makeNavigationProps();
      renderBadge({
        count: 1,
        serviceName: 'svc',
        navigationProps,
        ebt: { action: 'viewAlerts', element: 'serviceFlyoutAlertsBadge' },
      });

      const badge = screen.getByTestId('apmAlertsBadge');
      expect(badge).toHaveAttribute('data-ebt-action', 'viewAlerts');
      expect(badge).toHaveAttribute('data-ebt-element', 'serviceFlyoutAlertsBadge');
    });

    it('renders as a non-interactive badge when the locator returns no href', () => {
      const { navigationProps } = makeNavigationProps(jest.fn().mockReturnValue(undefined));
      renderBadge({ count: 2, serviceName: 'svc', navigationProps });

      const badge = screen.getByTestId('apmAlertsBadge');
      expect(badge.tagName.toLowerCase()).not.toBe('a');
      expect(badge.tagName.toLowerCase()).not.toBe('button');
    });
  });
});
