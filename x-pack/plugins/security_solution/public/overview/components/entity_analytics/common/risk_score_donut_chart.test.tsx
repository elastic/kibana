/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { RiskSeverity } from '../../../../../common/search_strategy';
import type { SeverityCount } from '../../../../common/components/severity/types';
import { render } from '@testing-library/react';
import React from 'react';
import { RiskScoreDonutChart } from './risk_score_donut_chart';
import { TestProviders } from '../../../../common/mock';

const severityCount: SeverityCount = {
  [RiskSeverity.low]: 1,
  [RiskSeverity.high]: 1,
  [RiskSeverity.moderate]: 1,
  [RiskSeverity.unknown]: 1,
  [RiskSeverity.critical]: 1,
};
const href = 'test-href';

describe('RiskScoreDonutChart', () => {
  it('renders link', () => {
    const { getByTestId } = render(
      <TestProviders>
        <RiskScoreDonutChart severityCount={severityCount} onClick={() => {}} href={href} />
      </TestProviders>
    );

    expect(getByTestId('view-total-button')).toBeInTheDocument();
    expect(getByTestId('view-total-button')).toHaveAttribute('href', href);
  });

  it('renders legends', () => {
    const { getByTestId } = render(
      <TestProviders>
        <RiskScoreDonutChart severityCount={severityCount} onClick={() => {}} href={href} />
      </TestProviders>
    );

    expect(getByTestId('legend')).toHaveTextContent('Unknown');
    expect(getByTestId('legend')).toHaveTextContent('Low');
    expect(getByTestId('legend')).toHaveTextContent('Moderate');
    expect(getByTestId('legend')).toHaveTextContent('High');
    expect(getByTestId('legend')).toHaveTextContent('Critical');
  });
});
