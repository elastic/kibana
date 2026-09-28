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
    expect(screen.getByText('Error rate peaked at 31%.')).toBeInTheDocument();
  });
});
