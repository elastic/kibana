/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { useFetchUx } from '../../../../hooks/overview/use_fetch_ux';
import { useFetchUxHasData } from '../../../../hooks/overview/use_fetch_ux_has_data';
import { render, data as dataMock } from '../../../../utils/test_helper';
import { UXSection } from '.';
import { response } from './mock_data/ux.mock';

jest.mock('react-router-dom', () => ({
  useLocation: () => ({
    pathname: '/observability/overview/',
    search: '',
  }),
}));

jest.mock('../../../../hooks/overview/use_fetch_ux');
jest.mock('../../../../hooks/overview/use_fetch_ux_has_data');

const useFetchUxHasDataMock = useFetchUxHasData as jest.Mock;
const useFetchUxMock = useFetchUx as jest.Mock;

describe('UXSection', () => {
  const bucketSize = { intervalString: '60s', bucketSize: 60, dateFormat: 'YYYY-MM-DD HH:mm' };

  beforeAll(() => {
    useFetchUxHasDataMock.mockReturnValue({
      isLoading: false,
      data: { hasData: true, serviceName: 'elastic-co-frontend' },
    });

    // @ts-expect-error `dataMock` is not properly propagating the mock types
    dataMock.query.timefilter.timefilter.getTime.mockReturnValue({
      from: '2020-10-08T06:00:00.000Z',
      to: '2020-10-08T07:00:00.000Z',
    });
  });
  it('renders with core web vitals', () => {
    useFetchUxMock.mockReturnValue({
      isLoading: false,
      isSuccess: true,
      ux: response,
    });

    const { getByText, getAllByText } = render(<UXSection bucketSize={bucketSize} />);

    expect(getByText('User Experience')).toBeInTheDocument();
    expect(getByText('Show dashboard')).toBeInTheDocument();
    expect(getByText('elastic-co-frontend')).toBeInTheDocument();
    expect(getByText('Largest contentful paint')).toBeInTheDocument();
    expect(getByText('1.94 s')).toBeInTheDocument();
    expect(getByText('14 ms')).toBeInTheDocument();
    expect(getByText('0.010')).toBeInTheDocument();

    // LCP Rank Values
    expect(getByText('Good (65%)')).toBeInTheDocument();
    expect(getByText('Needs improvement (19%)')).toBeInTheDocument();

    // LCP and FID both have same poor value
    expect(getAllByText('Poor (16%)')).toHaveLength(2);

    // FID Rank Values
    expect(getByText('Good (73%)')).toBeInTheDocument();
    expect(getByText('Needs improvement (11%)')).toBeInTheDocument();

    // CLS Rank Values
    expect(getByText('Good (86%)')).toBeInTheDocument();
    expect(getByText('Needs improvement (8%)')).toBeInTheDocument();
    expect(getByText('Poor (6%)')).toBeInTheDocument();
  });
  it('shows loading state', () => {
    useFetchUxMock.mockReturnValue({
      isLoading: true,
      isSuccess: false,
      ux: undefined,
    });

    const { getByText, queryAllByText, getAllByText } = render(
      <UXSection bucketSize={bucketSize} />
    );

    expect(getByText('User Experience')).toBeInTheDocument();
    expect(getAllByText('--')).toHaveLength(3);
    expect(queryAllByText('Show dashboard')).toEqual([]);
    expect(getByText('elastic-co-frontend')).toBeInTheDocument();
  });

  it('shows empty state', () => {
    useFetchUxMock.mockReturnValue({
      isLoading: false,
      isSuccess: true,
      ux: undefined,
    });

    const { getByText, queryAllByText, getAllByText } = render(
      <UXSection bucketSize={bucketSize} />
    );

    expect(getByText('User Experience')).toBeInTheDocument();
    expect(getAllByText('No data is available.')).toHaveLength(3);
    expect(queryAllByText('Show dashboard')).toEqual([]);
    expect(getByText('elastic-co-frontend')).toBeInTheDocument();
  });
});
