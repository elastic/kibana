/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { __IntlProvider as IntlProvider } from '@kbn/i18n-react';
import type { ServiceFlyoutService } from '..';
import { useServiceFlyoutTitle } from '.';

const mockUseServiceFlyoutLinks = jest.fn();
jest.mock('../hooks/use_service_flyout_links', () => ({
  useServiceFlyoutLinks: (...args: unknown[]) => mockUseServiceFlyoutLinks(...args),
}));

const mockUseServiceFlyoutContext = jest.fn();
jest.mock('../service_flyout_context', () => ({
  useServiceFlyoutContext: () => mockUseServiceFlyoutContext(),
}));

const baseNodeData: ServiceFlyoutService = {
  name: 'opbeans-java',
  agentName: 'java',
};

function setupContext({ serviceNameLink = true }: { serviceNameLink?: boolean } = {}) {
  mockUseServiceFlyoutContext.mockReturnValue({
    capabilities: {
      loading: false,
      error: undefined,
      header: { serviceNameLink, badges: true },
    },
  });
}

function TitleHarness() {
  return <>{useServiceFlyoutTitle(baseNodeData.name)}</>;
}

function renderTitle() {
  return render(
    <IntlProvider locale="en">
      <TitleHarness />
    </IntlProvider>
  );
}

describe('useServiceFlyoutTitle', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseServiceFlyoutLinks.mockReturnValue({
      apm: { overviewTab: '/app/apm/overview-href' },
      alerts: undefined,
      slos: undefined,
      discover: { traces: { href: undefined }, logs: { href: undefined } },
    });
  });

  it('renders the overview title link', () => {
    setupContext();
    renderTitle();

    const titleLink = screen.getByTestId('serviceFlyoutTitleLink');
    expect(titleLink).toHaveAttribute('href', '/app/apm/overview-href');
    expect(titleLink).toHaveAttribute('data-ebt-action', 'viewService');
    expect(titleLink).toHaveAttribute('data-ebt-element', 'serviceFlyoutTitle');
    expect(titleLink).toHaveTextContent(baseNodeData.name);
  });

  it('shows a tooltip describing the title link destination', async () => {
    setupContext();
    renderTitle();

    const titleLink = screen.getByTestId('serviceFlyoutTitleLink');
    const tooltipAnchor = titleLink.closest('.euiToolTipAnchor') ?? titleLink;
    fireEvent.mouseEnter(tooltipAnchor);
    fireEvent.mouseOver(tooltipAnchor);

    await waitFor(() => {
      expect(screen.getByRole('tooltip')).toHaveTextContent('Open service overview');
    });
  });

  it('renders the title as plain text when serviceNameLink capability is disabled', () => {
    setupContext({ serviceNameLink: false });
    renderTitle();

    expect(screen.queryByTestId('serviceFlyoutTitleLink')).not.toBeInTheDocument();
    expect(screen.getByTestId('serviceFlyoutTitle')).toHaveTextContent(baseNodeData.name);
  });
});
