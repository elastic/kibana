/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { render } from '@testing-library/react';
import React from 'react';
import { TestProviders } from '../../../../common/mock';
import { RiskScoreField } from './risk_score_field';
import { mockRiskScoreState } from './__mocks__';
import { getEmptyValue } from '../../../../common/components/empty_value';

describe('RiskScoreField', () => {
  it('renders', () => {
    const { getByTestId } = render(
      <TestProviders>
        <RiskScoreField riskScoreState={mockRiskScoreState} />
      </TestProviders>
    );

    expect(getByTestId('user-details-risk-score')).toBeInTheDocument();
    expect(getByTestId('user-details-risk-score')).toHaveTextContent('70');
  });

  it('does not render content when the license is invalid', () => {
    const { queryByTestId } = render(
      <TestProviders>
        <RiskScoreField riskScoreState={{ ...mockRiskScoreState, isAuthorized: false }} />
      </TestProviders>
    );

    expect(queryByTestId('user-details-risk-score')).not.toBeInTheDocument();
  });

  it('renders empty tag when risk score is undefined', () => {
    const { getByTestId } = render(
      <TestProviders>
        <RiskScoreField riskScoreState={{ ...mockRiskScoreState, data: [] }} />
      </TestProviders>
    );

    expect(getByTestId('user-details-risk-score')).toHaveTextContent(getEmptyValue());
  });
});
