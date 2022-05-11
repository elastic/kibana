/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { render } from '@testing-library/react';

import { RiskyHosts } from '.';
import { TestProviders } from '../../../../common/mock';
import { KpiRiskScoreStrategyResponse } from '../../../../../common/search_strategy';

describe('RiskyHosts', () => {
  const defaultProps = {
    error: undefined,
    loading: false,
  };

  test('it renders', () => {
    const { queryByText } = render(
      <TestProviders>
        <RiskyHosts {...defaultProps} />
      </TestProviders>
    );

    expect(queryByText('Risky Hosts')).toBeInTheDocument();
  });

  test('it displays loader while API is loading', () => {
    const { getByTestId } = render(
      <TestProviders>
        <RiskyHosts {...defaultProps} loading />
      </TestProviders>
    );

    expect(getByTestId('KpiLoader')).toBeInTheDocument();
  });

  test('it displays 0 risky hosts when initializing', () => {
    const { getByTestId } = render(
      <TestProviders>
        <RiskyHosts {...defaultProps} />
      </TestProviders>
    );

    expect(getByTestId('riskyHostsTotal').textContent).toEqual('0 Risky Hosts');
    expect(getByTestId('riskyHostsCriticalQuantity').textContent).toEqual('0 hosts');
    expect(getByTestId('riskyHostsHighQuantity').textContent).toEqual('0 hosts');
  });

  test('it displays risky hosts quantity returned by the API', () => {
    const data: KpiRiskScoreStrategyResponse = {
      rawResponse: {} as KpiRiskScoreStrategyResponse['rawResponse'],
      kpiRiskScore: {
        Critical: 1,
        High: 1,
        Unknown: 0,
        Low: 0,
        Moderate: 0,
      },
    };
    const { getByTestId } = render(
      <TestProviders>
        <RiskyHosts {...defaultProps} data={data} />
      </TestProviders>
    );

    expect(getByTestId('riskyHostsTotal').textContent).toEqual('2 Risky Hosts');
    expect(getByTestId('riskyHostsCriticalQuantity').textContent).toEqual('1 host');
    expect(getByTestId('riskyHostsHighQuantity').textContent).toEqual('1 host');
  });
});
