/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { I18nProvider } from '@kbn/i18n-react';
import type { EvidenceChart } from '@kbn/significant-events-schema';
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
                name: 'checkout-service',
                type: 'service',
                evidence: { description: 'Error rate peaked at 31%.' },
              },
              { name: 'payments-db' },
            ],
          }}
        />
      </I18nProvider>
    );

    expect(
      screen.getByText('Checkout failed for ~30% of requests for 40 minutes.')
    ).toBeInTheDocument();
    expect(screen.getAllByTestId('investigationOutputImpactEntity')).toHaveLength(2);
    expect(screen.getByText('service')).toBeInTheDocument();

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
          impact={{ entities: [{ name: 'checkout-service' }, { name: 'payments-db' }] }}
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

  it('hides what does not fit behind "Show more" and reveals it on click', () => {
    const entities = Array.from({ length: 20 }, (_, index) => ({ name: `service-${index}` }));
    render(
      <I18nProvider>
        <ImpactSection impact={{ summary: 'Checkout failed.', entities }} />
      </I18nProvider>
    );

    const shownBefore = screen.getAllByTestId('investigationOutputImpactEntity').length;
    expect(shownBefore).toBeLessThan(20);

    fireEvent.click(screen.getByTestId('investigationOutputImpactShowMore'));
    expect(screen.getAllByTestId('investigationOutputImpactEntity')).toHaveLength(20);
    expect(screen.getByTestId('investigationOutputImpactShowMore')).toHaveTextContent('Show less');

    fireEvent.click(screen.getByTestId('investigationOutputImpactShowMore'));
    expect(screen.getAllByTestId('investigationOutputImpactEntity')).toHaveLength(shownBefore);
  });

  it('renders no "Show more" when everything fits', () => {
    render(
      <I18nProvider>
        <ImpactSection impact={{ summary: 'Checkout failed.', entities: [{ name: 'checkout' }] }} />
      </I18nProvider>
    );

    expect(screen.queryByTestId('investigationOutputImpactShowMore')).not.toBeInTheDocument();
  });
});
