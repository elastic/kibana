/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React from 'react';
import moment from 'moment';
import * as fetcherHook from '../../../../hooks/use_fetcher';
import { render } from '../../../../utils/test_helper';
import { UXSection } from './';
import { response } from './mock_data/ux.mock';

describe('UXSection', () => {
  it('renders with core web vitals', () => {
    jest.spyOn(fetcherHook, 'useFetcher').mockReturnValue({
      data: response,
      status: fetcherHook.FETCH_STATUS.SUCCESS,
      refetch: jest.fn(),
    });
    const { getByText, getAllByText } = render(
      <UXSection
        absoluteTime={{
          start: moment('2020-06-29T11:38:23.747Z').valueOf(),
          end: moment('2020-06-29T12:08:23.748Z').valueOf(),
        }}
        relativeTime={{ start: 'now-15m', end: 'now' }}
        bucketSize="60s"
        serviceName="elastic-co-frontend"
      />
    );

    expect(getByText('User Experience')).toBeInTheDocument();
    expect(getByText('View in app')).toBeInTheDocument();
    expect(getByText('elastic-co-frontend')).toBeInTheDocument();
    expect(getByText('Largest contentful paint')).toBeInTheDocument();
    expect(getByText('1.94 s')).toBeInTheDocument();
    expect(getByText('14 ms')).toBeInTheDocument();
    expect(getByText('0.01')).toBeInTheDocument();

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
    jest.spyOn(fetcherHook, 'useFetcher').mockReturnValue({
      data: undefined,
      status: fetcherHook.FETCH_STATUS.LOADING,
      refetch: jest.fn(),
    });
    const { getByText, queryAllByText, getAllByText } = render(
      <UXSection
        absoluteTime={{
          start: moment('2020-06-29T11:38:23.747Z').valueOf(),
          end: moment('2020-06-29T12:08:23.748Z').valueOf(),
        }}
        relativeTime={{ start: 'now-15m', end: 'now' }}
        bucketSize="60s"
        serviceName="elastic-co-frontend"
      />
    );

    expect(getByText('User Experience')).toBeInTheDocument();
    expect(getAllByText('--')).toHaveLength(3);
    expect(queryAllByText('View in app')).toEqual([]);
    expect(getByText('elastic-co-frontend')).toBeInTheDocument();
  });
  it('shows empty state', () => {
    jest.spyOn(fetcherHook, 'useFetcher').mockReturnValue({
      data: undefined,
      status: fetcherHook.FETCH_STATUS.SUCCESS,
      refetch: jest.fn(),
    });
    const { getByText, queryAllByText, getAllByText } = render(
      <UXSection
        absoluteTime={{
          start: moment('2020-06-29T11:38:23.747Z').valueOf(),
          end: moment('2020-06-29T12:08:23.748Z').valueOf(),
        }}
        relativeTime={{ start: 'now-15m', end: 'now' }}
        bucketSize="60s"
        serviceName="elastic-co-frontend"
      />
    );

    expect(getByText('User Experience')).toBeInTheDocument();
    expect(getAllByText('No data is available.')).toHaveLength(3);
    expect(queryAllByText('View in app')).toEqual([]);
    expect(getByText('elastic-co-frontend')).toBeInTheDocument();
  });
});
