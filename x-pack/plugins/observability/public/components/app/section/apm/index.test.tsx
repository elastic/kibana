/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React from 'react';
import * as fetcherHook from '../../../../hooks/use_fetcher';
import { render } from '../../../../utils/test_helper';
import { APMSection } from './';
import { response } from './mock_data/apm.mock';
import moment from 'moment';

describe('APMSection', () => {
  it('renders with transaction series and stats', () => {
    jest.spyOn(fetcherHook, 'useFetcher').mockReturnValue({
      data: response,
      status: fetcherHook.FETCH_STATUS.SUCCESS,
      refetch: jest.fn(),
    });
    const { getByText, queryAllByTestId } = render(
      <APMSection
        absoluteTime={{
          start: moment('2020-06-29T11:38:23.747Z').valueOf(),
          end: moment('2020-06-29T12:08:23.748Z').valueOf(),
        }}
        relativeTime={{ start: 'now-15m', end: 'now' }}
        bucketSize="60s"
      />
    );

    expect(getByText('APM')).toBeInTheDocument();
    expect(getByText('View in app')).toBeInTheDocument();
    expect(getByText('Services 11')).toBeInTheDocument();
    expect(getByText('Transactions per minute 312.00k')).toBeInTheDocument();
    expect(queryAllByTestId('loading')).toEqual([]);
  });
  it('shows loading state', () => {
    jest.spyOn(fetcherHook, 'useFetcher').mockReturnValue({
      data: undefined,
      status: fetcherHook.FETCH_STATUS.LOADING,
      refetch: jest.fn(),
    });
    const { getByText, queryAllByText, getByTestId } = render(
      <APMSection
        absoluteTime={{
          start: moment('2020-06-29T11:38:23.747Z').valueOf(),
          end: moment('2020-06-29T12:08:23.748Z').valueOf(),
        }}
        relativeTime={{ start: 'now-15m', end: 'now' }}
        bucketSize="60s"
      />
    );

    expect(getByText('APM')).toBeInTheDocument();
    expect(getByTestId('loading')).toBeInTheDocument();
    expect(queryAllByText('View in app')).toEqual([]);
    expect(queryAllByText('Services 11')).toEqual([]);
    expect(queryAllByText('Transactions per minute 312.00k')).toEqual([]);
  });
});
