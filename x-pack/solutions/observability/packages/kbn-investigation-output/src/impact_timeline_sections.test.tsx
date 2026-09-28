/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { I18nProvider } from '@kbn/i18n-react';
import { ImpactSection } from './impact_section';
import { TimelineSection } from './timeline_section';

describe('ImpactSection', () => {
  it('renders nothing without a summary or entities', () => {
    const { container } = render(<ImpactSection impact={{ entities: [] }} />);

    expect(container).toBeEmptyDOMElement();
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
    expect(screen.getByText('Error rate peaked at 31%.')).toBeInTheDocument();
  });
});

describe('TimelineSection', () => {
  it('renders nothing for an empty timeline', () => {
    const { container } = render(<TimelineSection timeline={[]} />);

    expect(container).toBeEmptyDOMElement();
  });

  it('renders one item per event in the given order', () => {
    render(
      <I18nProvider>
        <TimelineSection
          timeline={[
            { timestamp: '2026-07-28T14:02:00Z', type: 'change', summary: 'Deploy v2.3.1.' },
            { timestamp: '2026-07-28T14:05:00Z', type: 'symptom', summary: 'Errors spike.' },
          ]}
        />
      </I18nProvider>
    );

    expect(screen.getByTestId('investigationOutputTimelineEvent-change')).toHaveTextContent(
      'Deploy v2.3.1.'
    );
    expect(screen.getByTestId('investigationOutputTimelineEvent-symptom')).toHaveTextContent(
      'Errors spike.'
    );
  });

  it('shows an unparseable timestamp as-is', () => {
    render(
      <I18nProvider>
        <TimelineSection timeline={[{ timestamp: 'shortly after', type: 'other', summary: 'x' }]} />
      </I18nProvider>
    );

    expect(screen.getByText(/shortly after/)).toBeInTheDocument();
  });
});
