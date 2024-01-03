/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { render } from '@testing-library/react';
import React from 'react';
import { TestProviders } from '../../../common/mock';
import { mockRiskScoreState } from '../../../flyout/entity_details/user_right/mocks';
import { RiskSummary } from './risk_summary';

// we need just array size to be 6
const mockUseRiskContributingAlerts = jest
  .fn()
  .mockReturnValue({ loading: false, data: [{}, {}, {}, {}, {}, {}] });

jest.mock('../../hooks/use_risk_contributing_alerts', () => ({
  useRiskContributingAlerts: () => mockUseRiskContributingAlerts(),
}));
jest.mock('../../../common/components/visualization_actions/visualization_embeddable');

describe('RiskSummary', () => {
  it('renders risk summary table', () => {
    const { getByTestId } = render(
      <TestProviders>
        <RiskSummary
          riskScoreData={mockRiskScoreState}
          queryId={'testQuery'}
          openDetailsPanel={() => {}}
        />
      </TestProviders>
    );

    expect(getByTestId('risk-summary-table')).toBeInTheDocument();
    expect(getByTestId('risk-summary-table')).toHaveTextContent('Inputs6');
    expect(getByTestId('risk-summary-table')).toHaveTextContent('CategoryAlerts');
  });

  it('renders risk summary table when riskScoreData is empty', () => {
    const { getByTestId } = render(
      <TestProviders>
        <RiskSummary
          riskScoreData={{ ...mockRiskScoreState, data: undefined }}
          queryId={'testQuery'}
          openDetailsPanel={() => {}}
        />
      </TestProviders>
    );
    expect(getByTestId('risk-summary-table')).toBeInTheDocument();
  });

  it('renders visualization embeddable', () => {
    const { getByTestId } = render(
      <TestProviders>
        <RiskSummary
          riskScoreData={mockRiskScoreState}
          queryId={'testQuery'}
          openDetailsPanel={() => {}}
        />
      </TestProviders>
    );

    expect(getByTestId('visualization-embeddable')).toBeInTheDocument();
  });

  it('renders updated at', () => {
    const { getByTestId } = render(
      <TestProviders>
        <RiskSummary
          riskScoreData={mockRiskScoreState}
          queryId={'testQuery'}
          openDetailsPanel={() => {}}
        />
      </TestProviders>
    );

    expect(getByTestId('risk-summary-updatedAt')).toHaveTextContent('Updated Nov 8, 1989');
  });
});
