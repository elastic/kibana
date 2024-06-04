/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { RiskSeverity } from '../../../../common/search_strategy';
import type { SeverityCount } from '../severity/types';
import { render } from '@testing-library/react';
import React from 'react';
import { RiskScoreDonutChart } from '.';
import { TestProviders } from '../../../common/mock';

const severityCount: SeverityCount = {
  [RiskSeverity.Low]: 1,
  [RiskSeverity.High]: 1,
  [RiskSeverity.Moderate]: 1,
  [RiskSeverity.Unknown]: 1,
  [RiskSeverity.Critical]: 1,
};

describe('RiskScoreDonutChart', () => {
  it('renders legends', () => {
    const { getByTestId } = render(
      <TestProviders>
        <RiskScoreDonutChart severityCount={severityCount} />
      </TestProviders>
    );

    expect(getByTestId('legend')).toHaveTextContent('Unknown');
    expect(getByTestId('legend')).toHaveTextContent('Low');
    expect(getByTestId('legend')).toHaveTextContent('Moderate');
    expect(getByTestId('legend')).toHaveTextContent('High');
    expect(getByTestId('legend')).toHaveTextContent('Critical');
  });
});
