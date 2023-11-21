/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SimpleRiskInput } from '../../../../common/risk_engine';
import { RiskCategories } from '../../../../common/risk_engine';
import { fireEvent, render } from '@testing-library/react';
import React from 'react';
import { RiskInputsPanel } from '.';
import { TestProviders } from '../../../common/mock';
import { times } from 'lodash/fp';
import { alertDataMock } from './mocks';

const mockUseAlertsByIds = jest.fn().mockReturnValue({ loading: false, data: [] });

jest.mock('../../../common/containers/alerts/use_alerts_by_ids', () => ({
  useAlertsByIds: () => mockUseAlertsByIds(),
}));

const TEST_RISK_INPUT: SimpleRiskInput = {
  id: '123',
  index: '_test_index',
  category: RiskCategories.category_1,
  description: 'test description',
  risk_score: 70,
  timestamp: '2023-05-15T16:12:14.967Z',
};

describe('RiskInputsPanel', () => {
  it('renders', () => {
    mockUseAlertsByIds.mockReturnValue({
      loading: false,
      error: false,
      data: [alertDataMock],
    });

    const { getByTestId } = render(
      <TestProviders>
        <RiskInputsPanel riskInputs={[TEST_RISK_INPUT]} />
      </TestProviders>
    );

    expect(getByTestId('risk-inputs-panel')).toBeInTheDocument();
    expect(getByTestId('risk-input-table-description-cell')).toHaveTextContent(
      'Risk inputRule Name'
    );
  });

  it('paginates', () => {
    const riskInputs = times((index) => ({ ...TEST_RISK_INPUT, id: index.toString() }), 11);
    const alerts = times((index) => ({ ...alertDataMock, _id: index.toString() }), 11);

    mockUseAlertsByIds.mockReturnValue({
      loading: false,
      error: false,
      data: alerts,
    });

    const { getAllByTestId, getByLabelText } = render(
      <TestProviders>
        <RiskInputsPanel riskInputs={riskInputs} />
      </TestProviders>
    );

    expect(getAllByTestId('risk-input-table-description-cell')).toHaveLength(10);

    fireEvent.click(getByLabelText('Next page'));

    expect(getAllByTestId('risk-input-table-description-cell')).toHaveLength(1);
  });
});
