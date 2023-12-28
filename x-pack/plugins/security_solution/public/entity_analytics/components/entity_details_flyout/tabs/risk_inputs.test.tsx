/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { fireEvent, render } from '@testing-library/react';
import React from 'react';
import { TestProviders } from '../../../../common/mock';
import { times } from 'lodash/fp';
import { RiskInputsTab } from './risk_inputs';
import { alertDataMock } from '../mocks';
import { RiskSeverity } from '../../../../../common/search_strategy';

const mockUseRiskContributingAlerts = jest.fn().mockReturnValue({ loading: false, data: [] });

jest.mock('../../../hooks/use_risk_contributing_alerts', () => ({
  useRiskContributingAlerts: () => mockUseRiskContributingAlerts(),
}));

const riskScore = {
  '@timestamp': '2021-08-19T16:00:00.000Z',
  user: {
    name: 'elastic',
    risk: {
      rule_risks: [],
      calculated_score_norm: 100,
      multipliers: [],
      calculated_level: RiskSeverity.critical,
    },
  },
};

describe('RiskInputsTab', () => {
  it('renders', () => {
    mockUseRiskContributingAlerts.mockReturnValue({
      loading: false,
      error: false,
      data: [alertDataMock],
    });

    const { getByTestId } = render(
      <TestProviders>
        <RiskInputsTab riskScore={riskScore} />
      </TestProviders>
    );

    expect(getByTestId('risk-input-tab-title')).toBeInTheDocument();
    expect(getByTestId('risk-input-table-description-cell')).toHaveTextContent(
      'Risk inputRule Name'
    );
  });

  it('paginates', () => {
    const alerts = times(
      (number) => ({
        ...alertDataMock,
        _id: number.toString(),
      }),
      11
    );

    mockUseRiskContributingAlerts.mockReturnValue({
      loading: false,
      error: false,
      data: alerts,
    });

    const { getAllByTestId, getByLabelText } = render(
      <TestProviders>
        <RiskInputsTab riskScore={riskScore} />
      </TestProviders>
    );

    expect(getAllByTestId('risk-input-table-description-cell')).toHaveLength(10);

    fireEvent.click(getByLabelText('Next page'));

    expect(getAllByTestId('risk-input-table-description-cell')).toHaveLength(1);
  });
});
