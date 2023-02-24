/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, data as dataMock } from '../../../../utils/test_helper';
import { APMSection } from '.';
import { response } from './mock_data/apm.mock';
import { useFetchApmServicesHasData } from '../../../../hooks/overview/use_fetch_apm_services_has_data';
import { useFetchApmServices } from '../../../../hooks/overview/use_fetch_apm_services';

jest.mock('react-router-dom', () => ({
  useLocation: () => ({
    pathname: '/observability/overview/',
    search: '',
  }),
  useHistory: jest.fn(),
}));

jest.mock('../../../../hooks/overview/use_fetch_apm_services');
jest.mock('../../../../hooks/overview/use_fetch_apm_services_has_data');

const useFetchApmServicesHasDataMock = useFetchApmServicesHasData as jest.Mock;
const useFetchApmServicesMock = useFetchApmServices as jest.Mock;

const bucketSize = { intervalString: '60s', bucketSize: 60, dateFormat: 'YYYY-MM-DD HH:mm' };

describe('APMSection', () => {
  beforeAll(() => {
    useFetchApmServicesHasDataMock.mockReturnValue({ isLoading: false, data: { hasData: true } });

    // @ts-expect-error `dataMock` is not properly propagating the mock types
    dataMock.query.timefilter.timefilter.getTime.mockReturnValue({
      from: '2020-10-08T06:00:00.000Z',
      to: '2020-10-08T07:00:00.000Z',
    });
  });

  it('renders transaction stat less than 1k', () => {
    useFetchApmServicesMock.mockReturnValue({
      isLoading: false,
      isSuccess: true,
      services: {
        appLink: '/app/apm',
        stats: {
          services: { value: 11, type: 'number' },
          transactions: { value: 900, type: 'number' },
        },
        series: {
          transactions: { coordinates: [] },
        },
      },
    });

    const { getByRole, getByText, queryAllByTestId } = render(
      <APMSection bucketSize={bucketSize} />
    );

    expect(getByRole('heading')).toHaveTextContent('Services');
    expect(getByText('Show service inventory')).toBeInTheDocument();
    expect(getByText('Services 11')).toBeInTheDocument();
    expect(getByText('900.0 tpm')).toBeInTheDocument();
    expect(queryAllByTestId('loading')).toEqual([]);
  });

  it('renders with transaction series and stats', () => {
    useFetchApmServicesMock.mockReturnValue({
      isLoading: false,
      isSuccess: true,
      services: response,
    });

    const { getByRole, getByText, queryAllByTestId } = render(
      <APMSection bucketSize={bucketSize} />
    );

    expect(getByRole('heading')).toHaveTextContent('Services');
    expect(getByText('Show service inventory')).toBeInTheDocument();
    expect(getByText('Services 11')).toBeInTheDocument();
    expect(getByText('312.00k tpm')).toBeInTheDocument();
    expect(queryAllByTestId('loading')).toEqual([]);
  });

  it('shows loading state', () => {
    useFetchApmServicesMock.mockReturnValue({
      isLoading: true,
      isSuccess: false,
      services: undefined,
    });

    const { getByRole, queryAllByText, getByTestId } = render(
      <APMSection bucketSize={bucketSize} />
    );

    expect(getByRole('heading')).toHaveTextContent('Services');
    expect(getByTestId('loading')).toBeInTheDocument();
    expect(queryAllByText('Show service inventory')).toEqual([]);
    expect(queryAllByText('Services 11')).toEqual([]);
    expect(queryAllByText('312.00k tpm')).toEqual([]);
  });
});
