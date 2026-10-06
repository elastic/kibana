/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { I18nProvider } from '@kbn/i18n-react';
import type { InvestigationState } from '@kbn/significant-events-schema';
import { InvestigationOutput } from './investigation_output';

const renderWithI18n = (ui: React.ReactElement) => render(<I18nProvider>{ui}</I18nProvider>);

const liveState: InvestigationState = {
  summary: 'Latency spike correlates with a deploy at 14:02.',
  hypotheses: [
    {
      candidate: 'Network partition',
      confidence: 0.1,
      status: 'dismissed',
      reason: 'No packet loss observed.',
    },
    {
      candidate: 'Connection pool exhaustion after the 14:02 deploy',
      confidence: 0.6,
      status: 'investigating',
    },
  ],
};

const finalState: InvestigationState = {
  summary: 'The investigation is complete.',
  hypotheses: [
    {
      candidate: 'Disk saturation',
      confidence: 0.05,
      status: 'dismissed',
      reason: 'IOPS stayed flat.',
    },
    {
      candidate: 'Connection pool exhaustion after the 14:02 deploy',
      confidence: 0.9,
      status: 'confirmed',
      reason: 'Pool metrics spiked exactly at deploy time.',
    },
  ],
  conclusion: 'A deploy at 14:02 introduced a connection leak in the checkout service.',
  recommendations: [
    {
      title: 'Roll back the deployment that introduced the regression',
      confidence: 0.95,
      description: 'Restore the last known-good checkout deployment.',
      code: 'kubectl rollout undo deployment/checkout-service',
    },
    {
      title: 'Add a connection-pool saturation alert',
      confidence: 0.7,
      description: 'Alert before queued checkout requests begin to time out.',
    },
  ],
};

describe('InvestigationOutput', () => {
  it('renders a generic gathering-evidence message and an empty hypotheses placeholder when running with no state yet', () => {
    renderWithI18n(<InvestigationOutput status="running" />);

    expect(screen.getByText('Gathering evidence')).toBeInTheDocument();
    expect(screen.getByTestId('investigationOutputNoHypotheses')).toBeInTheDocument();
    expect(screen.queryByTestId('investigationOutputFinalResults')).not.toBeInTheDocument();
  });

  it('renders live state while running, including collapsed hypothesis accordions', () => {
    renderWithI18n(<InvestigationOutput status="running" state={liveState} />);

    expect(screen.getByText('Evaluating 2 hypotheses')).toBeInTheDocument();
    expect(screen.getByText(liveState.summary)).toBeInTheDocument();
    expect(screen.getByText('Network partition')).toBeInTheDocument();
    // Collapsed by default.
    expect(screen.getByText('Network partition').closest('button')).toHaveAttribute(
      'aria-expanded',
      'false'
    );
    expect(screen.getByTestId('investigationOutputHypothesisStatus-dismissed')).toBeInTheDocument();
    expect(screen.getAllByTestId('investigationOutputConfidenceBadge')[0]).toHaveTextContent('10%');
  });

  it('reveals a hypothesis reason when its accordion is expanded', () => {
    renderWithI18n(<InvestigationOutput status="running" state={liveState} />);

    fireEvent.click(screen.getByText('Network partition'));

    expect(screen.getByText('No packet loss observed.')).toBeInTheDocument();
  });

  it('shows a placeholder when a hypothesis has no reason yet', () => {
    renderWithI18n(<InvestigationOutput status="running" state={liveState} />);

    fireEvent.click(screen.getByText('Connection pool exhaustion after the 14:02 deploy'));

    expect(screen.getByText('No reasoning recorded yet.')).toBeInTheDocument();
  });

  it('does not render final results for a mid-run conclusion (still a draft, possibly mangled markdown)', () => {
    renderWithI18n(<InvestigationOutput status="running" state={finalState} />);

    expect(screen.queryByTestId('investigationOutputFinalResults')).not.toBeInTheDocument();
  });

  it('renders structured final findings without numeric confidence', () => {
    renderWithI18n(<InvestigationOutput status="complete" state={finalState} />);

    expect(screen.getByText('Investigation complete')).toBeInTheDocument();
    expect(screen.getByTestId('investigationOutputHypothesisStatus-confirmed')).toBeInTheDocument();

    const finalResults = screen.getByTestId('investigationOutputFinalResults');
    expect(finalResults).toBeInTheDocument();
    expect(finalResults).toHaveTextContent(
      'A deploy at 14:02 introduced a connection leak in the checkout service.'
    );
    expect(finalResults).toHaveTextContent('Proposed actions');
    expect(finalResults).toHaveTextContent(
      'Roll back the deployment that introduced the regression'
    );
    expect(finalResults).toHaveTextContent('Recommended');
    expect(finalResults).not.toHaveTextContent('95%');
  });

  it('renders titles as plain text while preserving markdown in descriptions', async () => {
    const user = userEvent.setup();
    const recommendationTitle =
      '**Block the attacker IPs** via `hosts.deny` and [runbook](https://example.com)';
    const stateWithMarkdown: InvestigationState = {
      ...finalState,
      recommendations: [
        {
          title: recommendationTitle,
          confidence: 0.9,
          description: 'Follow the **response procedure** in the [runbook](https://example.com).',
        },
      ],
    };

    renderWithI18n(<InvestigationOutput status="complete" state={stateWithMarkdown} />);

    const finalResults = screen.getByTestId('investigationOutputFinalResults');
    expect(finalResults).toHaveTextContent(recommendationTitle);
    expect(screen.queryByRole('link', { name: 'runbook' })).not.toBeInTheDocument();

    const recommendationButton = screen.getByText(recommendationTitle).closest('button');
    expect(recommendationButton).not.toBeNull();
    if (!recommendationButton) {
      throw new Error('Expected recommendation title to be rendered inside a button');
    }
    expect(recommendationButton.querySelector('a, div, p, button, strong, code')).toBeNull();
    await user.click(recommendationButton);

    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByText('response procedure').tagName).toBe('STRONG');
    expect(screen.getByRole('link', { name: 'runbook' })).toBeInTheDocument();
  });

  it.each([
    ['description', { description: '   ' }],
    ['code', { code: '   ' }],
  ] as const)(
    'does not make a recommendation interactive when its %s is whitespace-only',
    (_field, details) => {
      const title = 'Restart the checkout service';
      const stateWithWhitespaceDetails: InvestigationState = {
        ...finalState,
        recommendations: [{ title, confidence: 0.8, ...details }],
      };

      renderWithI18n(<InvestigationOutput status="complete" state={stateWithWhitespaceDetails} />);

      expect(screen.getByText(title).closest('button')).toBeNull();
    }
  );

  it('omits whitespace-only fields from mixed recommendation details', async () => {
    const user = userEvent.setup();
    const stateWithMixedDetails: InvestigationState = {
      ...finalState,
      recommendations: [
        {
          title: 'Restart the checkout service',
          confidence: 0.9,
          description: 'Restart every checkout instance.',
          code: '   ',
        },
        {
          title: 'Roll back the checkout service',
          confidence: 0.8,
          description: '   ',
          code: 'kubectl rollout undo deployment/checkout-service',
        },
      ],
    };

    renderWithI18n(<InvestigationOutput status="complete" state={stateWithMixedDetails} />);

    await user.click(screen.getByRole('button', { name: /Restart the checkout service/ }));
    expect(screen.getByRole('dialog')).toHaveTextContent('Restart every checkout instance.');
    expect(screen.getByRole('dialog').querySelector('pre')).not.toBeInTheDocument();
    fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Escape' });

    await user.click(screen.getByRole('button', { name: /Roll back the checkout service/ }));
    expect(screen.getByRole('dialog')).toHaveTextContent(
      'kubectl rollout undo deployment/checkout-service'
    );
    expect(screen.getByRole('dialog').querySelector('pre')).toBeInTheDocument();
  });

  it('opens recommendation details with a click', async () => {
    const user = userEvent.setup();
    renderWithI18n(<InvestigationOutput status="complete" state={finalState} />);

    const recommendations = screen.getByTestId('investigationOutputRecommendations');
    expect(recommendations).toHaveTextContent(
      'Roll back the deployment that introduced the regression'
    );
    const action = screen.getByRole('button', {
      name: /Roll back the deployment that introduced the regression/,
    });
    expect(action.querySelector('a, div, p, button')).toBeNull();
    await user.click(action);
    expect(screen.getByRole('dialog')).toHaveTextContent(
      'kubectl rollout undo deployment/checkout-service'
    );
    expect(screen.getByRole('dialog')).toHaveTextContent(
      'Restore the last known-good checkout deployment.'
    );
  });

  it('opens recommendation details with the keyboard and returns focus on close', async () => {
    const user = userEvent.setup();
    renderWithI18n(<InvestigationOutput status="complete" state={finalState} />);

    const action = screen.getByRole('button', {
      name: /Roll back the deployment that introduced the regression/,
    });
    action.focus();
    await user.keyboard('{Enter}');

    const dialog = screen.getByRole('dialog');
    expect(dialog).toHaveTextContent('Roll back the deployment that introduced the regression');

    fireEvent.keyDown(dialog, { key: 'Escape' });

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(action).toHaveFocus();
  });

  it('renders the conclusion on its own when no recommendations were reported', () => {
    const conclusionOnly: InvestigationState = {
      summary: finalState.summary,
      hypotheses: finalState.hypotheses,
      conclusion: finalState.conclusion,
    };

    renderWithI18n(<InvestigationOutput status="complete" state={conclusionOnly} />);

    expect(screen.getByTestId('investigationOutputFinalResults')).toHaveTextContent(
      'A deploy at 14:02 introduced a connection leak in the checkout service.'
    );
    expect(screen.queryByTestId('investigationOutputRecommendations')).not.toBeInTheDocument();
  });

  it('renders no final results block when a complete investigation reported neither', () => {
    const withoutFinalResults: InvestigationState = {
      summary: finalState.summary,
      hypotheses: finalState.hypotheses,
    };

    renderWithI18n(<InvestigationOutput status="complete" state={withoutFinalResults} />);

    expect(screen.queryByTestId('investigationOutputFinalResults')).not.toBeInTheDocument();
  });

  it('renders no final results block for a whitespace-only conclusion', () => {
    const withoutVisibleFinalResults: InvestigationState = {
      summary: finalState.summary,
      hypotheses: finalState.hypotheses,
      conclusion: '   ',
    };

    renderWithI18n(<InvestigationOutput status="complete" state={withoutVisibleFinalResults} />);

    expect(screen.queryByTestId('investigationOutputFinalResults')).not.toBeInTheDocument();
  });

  it('renders a loading state while the persisted result is being fetched', () => {
    renderWithI18n(<InvestigationOutput status="loading" />);

    expect(screen.getByText('Loading investigation result…')).toBeInTheDocument();
    expect(screen.getByTestId('investigationOutputLoadingSpinner')).toBeInTheDocument();
  });

  it('renders a failed header with the error detail when the investigation failed', () => {
    renderWithI18n(<InvestigationOutput status="failed" error="No connector configured" />);

    expect(screen.getByText('Investigation failed')).toBeInTheDocument();
    expect(screen.getByText('No connector configured')).toBeInTheDocument();
    expect(screen.queryByTestId('investigationOutputFinalResults')).not.toBeInTheDocument();
  });

  it('renders a failed header even when stale live state is still shown', () => {
    renderWithI18n(
      <InvestigationOutput status="failed" state={liveState} error="The agent timed out." />
    );

    expect(screen.getByText('Investigation failed')).toBeInTheDocument();
    expect(screen.getByText('The agent timed out.')).toBeInTheDocument();
    expect(screen.getByText(liveState.summary)).toBeInTheDocument();
  });

  it('renders an unavailable header alongside stale live state when the result could not be loaded', () => {
    renderWithI18n(
      <InvestigationOutput
        status="unavailable"
        state={liveState}
        error="Couldn't load the investigation result."
      />
    );

    expect(screen.getByText('Investigation result unavailable')).toBeInTheDocument();
    expect(screen.getByText("Couldn't load the investigation result.")).toBeInTheDocument();
    expect(screen.getByText(liveState.summary)).toBeInTheDocument();
  });
});
