/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { HasDataContextValue } from '../../../../../context/has_data_context/has_data_context';
import * as fetcherHook from '@kbn/observability-shared-plugin/public/hooks/use_fetcher';
import * as hasDataHook from '../../../../../hooks/use_has_data';
import { render, data as dataMock } from '../../../../../utils/test_helper';
import { UXSection } from './ux_section';
import { response } from './mock_data/ux.mock';
import {
  LEGEND_GOOD_LABEL,
  LEGEND_NEEDS_IMPROVEMENT_LABEL,
  LEGEND_POOR_LABEL,
} from './core_web_vitals/translations';

jest.mock('react-router-dom', () => ({
  useLocation: () => ({
    pathname: '/observability/overview/',
    search: '',
  }),
}));

describe('UXSection', () => {
  const bucketSize = { intervalString: '60s', bucketSize: 60, dateFormat: 'YYYY-MM-DD HH:mm' };

  beforeAll(() => {
    jest.spyOn(hasDataHook, 'useHasData').mockReturnValue({
      hasDataMap: {
        ux: {
          status: fetcherHook.FETCH_STATUS.SUCCESS,
          hasData: true,
          serviceName: 'elastic-co-frontend',
        },
      },
    } as HasDataContextValue);

    // @ts-expect-error `dataMock` is not properly propagating the mock types
    dataMock.query.timefilter.timefilter.getTime.mockReturnValue({
      from: '2020-10-08T06:00:00.000Z',
      to: '2020-10-08T07:00:00.000Z',
    });
  });
  it('renders with core web vitals', () => {
    jest.spyOn(fetcherHook, 'useFetcher').mockReturnValue({
      data: response,
      status: fetcherHook.FETCH_STATUS.SUCCESS,
      refetch: jest.fn(),
    });
    const { getByText, getByTestId, getAllByTestId } = render(
      <UXSection bucketSize={bucketSize} />
    );

    expect(getByText('User Experience')).toBeInTheDocument();
    expect(getByText('Show dashboard')).toBeInTheDocument();
    expect(getByText('elastic-co-frontend')).toBeInTheDocument();
    expect(getByText('Largest contentful paint')).toBeInTheDocument();
    expect(getByText('1.94 s')).toBeInTheDocument();
    expect(getByText('285 ms')).toBeInTheDocument();
    expect(getByText('0.010')).toBeInTheDocument();

    // LCP Rank Values
    expect(getByTestId(`${LEGEND_GOOD_LABEL}-65`)).toBeInTheDocument();
    expect(getByTestId(`${LEGEND_NEEDS_IMPROVEMENT_LABEL}-19`)).toBeInTheDocument();

    // LCP and FID both have same poor value
    expect(getAllByTestId(`${LEGEND_POOR_LABEL}-16`)).toHaveLength(2);

    // FID Rank Values
    expect(getByTestId(`${LEGEND_GOOD_LABEL}-73`)).toBeInTheDocument();
    expect(getByTestId(`${LEGEND_NEEDS_IMPROVEMENT_LABEL}-11`)).toBeInTheDocument();

    // CLS Rank Values
    expect(getByTestId(`${LEGEND_GOOD_LABEL}-86`)).toBeInTheDocument();
    expect(getByTestId(`${LEGEND_NEEDS_IMPROVEMENT_LABEL}-8`)).toBeInTheDocument();
    expect(getByTestId(`${LEGEND_POOR_LABEL}-6`)).toBeInTheDocument();
  });
  it('shows loading state', () => {
    jest.spyOn(fetcherHook, 'useFetcher').mockReturnValue({
      data: undefined,
      status: fetcherHook.FETCH_STATUS.LOADING,
      refetch: jest.fn(),
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
    jest.spyOn(fetcherHook, 'useFetcher').mockReturnValue({
      data: undefined,
      status: fetcherHook.FETCH_STATUS.SUCCESS,
      refetch: jest.fn(),
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
