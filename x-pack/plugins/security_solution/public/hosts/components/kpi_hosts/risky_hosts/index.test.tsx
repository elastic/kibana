/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { render } from '@testing-library/react';

import { RiskyHosts } from './';
import { TestProviders } from '../../../../common/mock';
import { useRiskyHostsComplete } from '../../../containers/kpi_hosts/risky_hosts';

jest.mock('../../../containers/kpi_hosts/risky_hosts');

describe('RiskyHosts', () => {
  beforeEach(() => {
    (useRiskyHostsComplete as jest.Mock).mockImplementation(() => ({
      start: () => {},
      loading: false,
    }));
  });

  const defaultProps = {
    filterQuery: '',
    from: '',
    to: '',
    skip: false,
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
    (useRiskyHostsComplete as jest.Mock).mockImplementation(() => ({
      start: () => {},
      loading: true,
    }));

    const { getByTestId } = render(
      <TestProviders>
        <RiskyHosts {...defaultProps} />
      </TestProviders>
    );

    expect(getByTestId('hostsKpiLoader')).toBeInTheDocument();
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
    const { queryByText } = render(
      <TestProviders>
        <RiskyHosts {...defaultProps} />
      </TestProviders>
    );

    expect(queryByText('Risky Hosts')).toBeInTheDocument();
  });
});
