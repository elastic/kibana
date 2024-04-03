/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { fireEvent, render } from '@testing-library/react';
import React from 'react';
import { TestProviders } from '../../../../common/mock';
import { alertInputDataMock } from '../mocks';
import { RiskInputsUtilityBar } from './utility_bar';

describe('RiskInputsUtilityBar', () => {
  it('renders', () => {
    const { getByTestId } = render(
      <TestProviders>
        <RiskInputsUtilityBar
          selectedAlerts={[]}
          pagination={{
            pageIndex: 0,
            totalItemCount: 0,
          }}
        />
      </TestProviders>
    );

    expect(getByTestId('risk-input-utility-bar')).toBeInTheDocument();
  });

  it('renders current page message when totalItemCount is 1', () => {
    const { getByTestId } = render(
      <TestProviders>
        <RiskInputsUtilityBar
          selectedAlerts={[]}
          pagination={{
            pageIndex: 0,
            totalItemCount: 1,
          }}
        />
      </TestProviders>
    );

    expect(getByTestId('risk-input-utility-bar')).toHaveTextContent('Showing 1 Risk contribution');
  });

  it('renders current page message when totalItemCount is 20', () => {
    const { getByTestId } = render(
      <TestProviders>
        <RiskInputsUtilityBar
          selectedAlerts={[]}
          pagination={{
            pageIndex: 0,
            totalItemCount: 20,
          }}
        />
      </TestProviders>
    );

    expect(getByTestId('risk-input-utility-bar')).toHaveTextContent(
      'Showing 1-10 of 20 Risk contribution'
    );
  });

  it('renders current page message when totalItemCount is 20 and on the second page', () => {
    const { getByTestId } = render(
      <TestProviders>
        <RiskInputsUtilityBar
          selectedAlerts={[]}
          pagination={{
            pageIndex: 1,
            totalItemCount: 20,
          }}
        />
      </TestProviders>
    );

    expect(getByTestId('risk-input-utility-bar')).toHaveTextContent(
      'Showing 11-20 of 20 Risk contribution'
    );
  });

  it('renders selected risk input message', () => {
    const { getByTestId } = render(
      <TestProviders>
        <RiskInputsUtilityBar
          selectedAlerts={[alertInputDataMock, alertInputDataMock, alertInputDataMock]}
          pagination={{
            pageIndex: 0,
            totalItemCount: 0,
          }}
        />
      </TestProviders>
    );

    expect(getByTestId('risk-input-utility-bar')).toHaveTextContent('3 selected risk contribution');
  });

  it('toggles the popover when button is clicked', () => {
    const { getByRole } = render(
      <TestProviders>
        <RiskInputsUtilityBar
          selectedAlerts={[alertInputDataMock, alertInputDataMock, alertInputDataMock]}
          pagination={{
            pageIndex: 0,
            totalItemCount: 0,
          }}
        />
      </TestProviders>
    );

    fireEvent.click(getByRole('button'));

    expect(getByRole('dialog')).toBeInTheDocument();
  });
});
