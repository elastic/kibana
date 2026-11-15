/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { fireEvent, render, screen, within } from '@testing-library/react';
import { I18nProvider } from '@kbn/i18n-react';
import type { EvidenceChart } from '@kbn/agentic-investigations-plugin/common';
import { ImpactSection } from './impact_section';

const sampleChart: EvidenceChart = {
  type: 'bar',
  title: 'Failed requests',
  x_axis: { type: 'time' },
  y_axis: {},
  series: [{ name: 'failures', points: [{ x: '2026-07-28T14:00:00Z', y: 3 }] }],
};

describe('ImpactSection', () => {
  it('renders nothing without a summary, evidence, or entities', () => {
    const { container } = render(<ImpactSection impact={{ entities: [] }} />);

    expect(container).toBeEmptyDOMElement();
  });

  it('renders a top-level summary and evidence without any entities', () => {
    render(
      <I18nProvider>
        <ImpactSection
          impact={{
            summary: 'Checkout failed for ~30% of requests for 40 minutes.',
            evidence: { description: 'Failed checkout requests peaked at 1,290 per 5 minutes.' },
          }}
        />
      </I18nProvider>
    );

    expect(
      screen.getByText('Checkout failed for ~30% of requests for 40 minutes.')
    ).toBeInTheDocument();
    expect(screen.getByTestId('investigationOutputImpactEvidence')).toHaveTextContent(
      'Failed checkout requests peaked at 1,290 per 5 minutes.'
    );
    expect(screen.queryByTestId('investigationOutputImpactEntity')).not.toBeInTheDocument();
  });

  it('renders the impact narrative and each entity with its evidence', () => {
    render(
      <I18nProvider>
        <ImpactSection
          impact={{
            summary: 'Checkout failed for ~30% of requests for 40 minutes.',
            entities: [
              {
                id: 'checkout-service',
                name: 'checkout-service',
                type: 'service',
                evidence: { description: 'Error rate peaked at 31%.' },
              },
              { id: 'payments-db', name: 'payments-db' },
            ],
          }}
        />
      </I18nProvider>
    );

    expect(
      screen.getByText('Checkout failed for ~30% of requests for 40 minutes.')
    ).toBeInTheDocument();
    expect(screen.getAllByTestId('investigationOutputImpactEntity')).toHaveLength(2);
    expect(screen.getByTestId('investigationOutputImpactEntityType')).toHaveTextContent(
      '· service'
    );

    // Entity evidence starts collapsed and expands on click.
    const toggle = screen.getByRole('button', { name: /checkout-service/ });
    expect(toggle).toHaveAttribute('aria-expanded', 'false');
    fireEvent.click(toggle);
    expect(toggle).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByText('Error rate peaked at 31%.')).toBeVisible();

    // An entity without evidence has nothing to expand.
    expect(screen.queryByRole('button', { name: /payments-db/ })).not.toBeInTheDocument();
  });

  it('renders all entities in one shared panel', () => {
    render(
      <I18nProvider>
        <ImpactSection
          impact={{
            entities: [
              { id: 'checkout-service', name: 'checkout-service' },
              { id: 'payments-db', name: 'payments-db' },
            ],
          }}
        />
      </I18nProvider>
    );

    const panel = screen.getByTestId('investigationOutputImpactEntities');
    expect(
      panel.querySelectorAll('[data-test-subj="investigationOutputImpactEntity"]')
    ).toHaveLength(2);
  });

  it('puts the evidence chart before its description', () => {
    render(
      <I18nProvider>
        <ImpactSection
          impact={{
            summary: 'Checkout failed.',
            evidence: { description: 'Failed requests per minute.', chart: sampleChart },
          }}
        />
      </I18nProvider>
    );

    const evidence = screen.getByTestId('investigationOutputImpactEvidence');
    const chart = screen.getByTestId('investigationEvidenceChart');
    const description = screen.getByText('Failed requests per minute.');
    const order = Array.from(evidence.querySelectorAll('*'));
    expect(order.indexOf(chart)).toBeLessThan(order.indexOf(description));
  });

  it('puts the evidence chart before the impact summary', () => {
    render(
      <I18nProvider>
        <ImpactSection
          impact={{
            summary: 'Checkout failed.',
            evidence: { chart: sampleChart },
          }}
        />
      </I18nProvider>
    );

    const section = screen.getByTestId('investigationOutputImpact');
    const chart = screen.getByTestId('investigationEvidenceChart');
    const summary = screen.getByTestId('investigationOutputImpactSummary');
    const order = Array.from(section.querySelectorAll('*'));
    expect(order.indexOf(chart)).toBeLessThan(order.indexOf(summary));
  });

  it('cuts a long summary short behind "Show more" and shows it in full on click', () => {
    const summary = `${'Checkout failed for most shoppers. '.repeat(20)}Final sentence.`;
    const entities = Array.from({ length: 8 }, (_, index) => ({
      id: `service-${index}`,
      name: `service-${index}`,
    }));
    render(
      <I18nProvider>
        <ImpactSection
          impact={{ summary, evidence: { description: 'Failed requests.', chart: sampleChart } }}
        />
        <ImpactSection impact={{ summary, entities }} />
      </I18nProvider>
    );

    const [withEvidence, withEntities] = screen.getAllByTestId('investigationOutputImpact');
    const summaryOf = (section: HTMLElement) =>
      within(section).getByTestId('investigationOutputImpactSummary');
    const toggleOf = (section: HTMLElement) =>
      within(section).getByTestId('investigationOutputImpactShowMore');

    expect(summaryOf(withEvidence)).not.toHaveTextContent('Final sentence.');
    expect(summaryOf(withEvidence)).toHaveTextContent('…');
    // Only the summary is cut: evidence and every entity stay visible.
    expect(within(withEvidence).getByTestId('investigationEvidenceChart')).toBeInTheDocument();
    expect(within(withEvidence).getByText('Failed requests.')).toBeInTheDocument();
    expect(within(withEntities).getAllByTestId('investigationOutputImpactEntity')).toHaveLength(8);

    fireEvent.click(toggleOf(withEvidence));
    expect(summaryOf(withEvidence)).toHaveTextContent('Final sentence.');
    expect(toggleOf(withEvidence)).toHaveTextContent('Show less');

    fireEvent.click(toggleOf(withEvidence));
    expect(summaryOf(withEvidence)).not.toHaveTextContent('Final sentence.');
  });

  it('renders no "Show more" for a short summary', () => {
    render(
      <I18nProvider>
        <ImpactSection
          impact={{ summary: 'Checkout failed.', entities: [{ id: 'checkout', name: 'checkout' }] }}
        />
      </I18nProvider>
    );

    expect(screen.queryByTestId('investigationOutputImpactShowMore')).not.toBeInTheDocument();
  });
});
