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
import { alertDataMock } from '../mocks';
import { RiskInputsTab } from './risk_inputs';

const mockUseAlertsByIds = jest.fn().mockReturnValue({ loading: false, data: [] });

jest.mock('../../../../common/containers/alerts/use_alerts_by_ids', () => ({
  useAlertsByIds: () => mockUseAlertsByIds(),
}));

const ALERT_IDS = ['123'];

describe('RiskInputsTab', () => {
  it('renders', () => {
    mockUseAlertsByIds.mockReturnValue({
      loading: false,
      error: false,
      data: [alertDataMock],
    });

    const { getByTestId } = render(
      <TestProviders>
        <RiskInputsTab alertIds={ALERT_IDS} />
      </TestProviders>
    );

    expect(getByTestId('risk-input-tab-title')).toBeInTheDocument();
    expect(getByTestId('risk-input-table-description-cell')).toHaveTextContent(
      'Risk inputRule Name'
    );
  });

  it('paginates', () => {
    const alertsIds = times((number) => number.toString(), 11);
    const alerts = times(
      (number) => ({
        ...alertDataMock,
        _id: number.toString(),
      }),
      11
    );

    mockUseAlertsByIds.mockReturnValue({
      loading: false,
      error: false,
      data: alerts,
    });

    const { getAllByTestId, getByLabelText } = render(
      <TestProviders>
        <RiskInputsTab alertIds={alertsIds} />
      </TestProviders>
    );

    expect(getAllByTestId('risk-input-table-description-cell')).toHaveLength(10);

    fireEvent.click(getByLabelText('Next page'));

    expect(getAllByTestId('risk-input-table-description-cell')).toHaveLength(1);
  });
});
