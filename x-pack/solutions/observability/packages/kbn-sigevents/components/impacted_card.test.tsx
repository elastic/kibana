/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { I18nProvider } from '@kbn/i18n-react';
import { ImpactedCard } from './impacted_card';

const renderWithIntl = (ui: React.ReactElement) => {
  return render(<I18nProvider>{ui}</I18nProvider>);
};

describe('ImpactedCard', () => {
  it('renders the label and the value', () => {
    renderWithIntl(<ImpactedCard label="Service" value="payment" />);

    expect(screen.getByTestId('sigeventsOverviewImpactedCard')).toBeInTheDocument();
    expect(screen.getByText('Service')).toBeInTheDocument();
    expect(screen.getByText('payment')).toBeInTheDocument();
  });

  it('renders a ReactNode value', () => {
    renderWithIntl(
      <ImpactedCard
        label="Dropped events"
        value={<span data-test-subj="custom-value">1,000,000</span>}
      />
    );

    expect(screen.getByTestId('custom-value')).toBeInTheDocument();
    expect(screen.getByText('1,000,000')).toBeInTheDocument();
  });

  it('calls onClick when the card is clicked', () => {
    const onClick = jest.fn();
    renderWithIntl(<ImpactedCard label="Service" value="payment" onClick={onClick} />);

    fireEvent.click(screen.getByRole('button', { name: /Service/i }));
    expect(onClick).toHaveBeenCalledTimes(1);
  });
});
