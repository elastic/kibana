/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { I18nProvider } from '@kbn/i18n-react';
import type { Investigation } from '@kbn/agentic-investigations-plugin/common';
import { InvestigationOutput } from './investigation_output';

const renderWithI18n = (ui: React.ReactElement) => render(<I18nProvider>{ui}</I18nProvider>);

const investigation = (overrides: Partial<Investigation> = {}): Investigation => ({
  id: 'conv-1',
  title: 'Checkout latency spike',
  created_at: '2026-07-28T14:00:00.000Z',
  updated_at: '2026-07-28T14:05:00.000Z',
  agent_id: 'nightshift.investigation',
  metadata: {
    status: 'open',
    severity: 'high',
    summary: 'Latency spike correlates with a deploy at 14:02.',
    verdict: 'A deploy at 14:02 introduced a connection leak in the checkout service.',
  },
  in_progress: false,
  subjects: [],
  impact: {
    summary: 'Checkout p99 tripled.',
    entities: [{ id: 'checkout', name: 'checkout' }],
    created_at: '2026-07-28T14:00:00.000Z',
  },
  hypotheses: {
    hypotheses: [
      { candidate: 'Disk saturation', confidence: 0.05, status: 'dismissed', reason: 'Flat.' },
      {
        candidate: 'Connection pool exhaustion',
        confidence: 0.9,
        status: 'confirmed',
        reason: 'Pool metrics spiked at deploy time.',
        evidence: [{ description: 'Pool usage hit 100% at 14:03.' }],
      },
    ],
    created_at: '2026-07-28T14:00:00.000Z',
  },
  proposals: [
    {
      id: 'p-1',
      title: 'Roll back the checkout deploy',
      comment: 'Restore the last good version.',
      status: 'pending',
      impact: 'high',
      confidence: 'high',
      created_at: '2026-07-28T14:05:00.000Z',
    },
  ],
  ...overrides,
});

describe('InvestigationOutput', () => {
  it('renders the summary, the hypotheses, and the final results once complete', async () => {
    renderWithI18n(<InvestigationOutput status="complete" investigation={investigation()} />);

    expect(screen.getByText('Investigation complete')).toBeInTheDocument();
    expect(
      screen.getByText('Latency spike correlates with a deploy at 14:02.')
    ).toBeInTheDocument();
    expect(screen.getAllByTestId('investigationOutputHypothesis')).toHaveLength(2);
    expect(screen.getByTestId('investigationOutputConclusion')).toHaveTextContent(
      'A deploy at 14:02 introduced a connection leak'
    );
    expect(screen.getByTestId('investigationOutputImpact')).toHaveTextContent('checkout');
    expect(screen.getByTestId('investigationOutputProposals')).toHaveTextContent(
      'Roll back the checkout deploy'
    );
    expect(screen.getByTestId('investigationOutputProposals')).toHaveTextContent('Needs review');

    await userEvent.click(screen.getByText('Connection pool exhaustion'));
    expect(screen.getByTestId('investigationEvidenceItem')).toHaveTextContent(
      'Pool usage hit 100% at 14:03.'
    );
  });

  it('shows progress and holds back the conclusion while running', () => {
    renderWithI18n(
      <InvestigationOutput
        status="running"
        investigation={investigation({
          in_progress: true,
          hypotheses: {
            hypotheses: [{ candidate: 'Bad deploy', confidence: 0.5, status: 'investigating' }],
            created_at: '2026-07-28T14:00:00.000Z',
          },
        })}
      />
    );

    expect(screen.getByTestId('investigationOutputLoadingSpinner')).toBeInTheDocument();
    expect(screen.getByText('Evaluating 1 hypothesis')).toBeInTheDocument();
    expect(screen.queryByTestId('investigationOutputFinalResults')).not.toBeInTheDocument();
  });

  it('says no hypotheses were recorded for a complete investigation without any', () => {
    renderWithI18n(
      <InvestigationOutput
        status="complete"
        investigation={investigation({ hypotheses: undefined })}
      />
    );

    expect(screen.getByTestId('investigationOutputNoHypotheses')).toHaveTextContent(
      'No hypotheses were recorded for this investigation.'
    );
  });

  it('shows the error of an unavailable investigation', () => {
    renderWithI18n(<InvestigationOutput status="unavailable" error="No permission" />);

    expect(screen.getByText('Investigation unavailable')).toBeInTheDocument();
    expect(screen.getByTestId('investigationOutputError')).toHaveTextContent('No permission');
  });
});
