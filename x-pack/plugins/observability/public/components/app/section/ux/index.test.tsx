/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { AppMountParameters, CoreStart } from 'kibana/public';
import React from 'react';
import { HasDataContextValue } from '../../../../context/has_data_context';
import * as fetcherHook from '../../../../hooks/use_fetcher';
import * as hasDataHook from '../../../../hooks/use_has_data';
import * as pluginContext from '../../../../hooks/use_plugin_context';
import { ObservabilityPluginSetupDeps } from '../../../../plugin';
import { render } from '../../../../utils/test_helper';
import { UXSection } from './';
import { response } from './mock_data/ux.mock';

jest.mock('react-router-dom', () => ({
  useLocation: () => ({
    pathname: '/observability/overview/',
    search: '',
  }),
}));

describe('UXSection', () => {
  beforeAll(() => {
    jest.spyOn(hasDataHook, 'useHasData').mockReturnValue({
      hasData: {
        ux: {
          status: fetcherHook.FETCH_STATUS.SUCCESS,
          hasData: { hasData: true, serviceName: 'elastic-co-frontend' },
        },
      },
    } as HasDataContextValue);
    jest.spyOn(pluginContext, 'usePluginContext').mockImplementation(() => ({
      core: ({
        uiSettings: { get: jest.fn() },
        http: { basePath: { prepend: jest.fn() } },
      } as unknown) as CoreStart,
      appMountParameters: {} as AppMountParameters,
      plugins: ({
        data: {
          query: {
            timefilter: {
              timefilter: {
                getTime: jest.fn().mockImplementation(() => ({
                  from: '2020-10-08T06:00:00.000Z',
                  to: '2020-10-08T07:00:00.000Z',
                })),
              },
            },
          },
        },
      } as unknown) as ObservabilityPluginSetupDeps,
    }));
  });
  it('renders with core web vitals', () => {
    jest.spyOn(fetcherHook, 'useFetcher').mockReturnValue({
      data: response,
      status: fetcherHook.FETCH_STATUS.SUCCESS,
      refetch: jest.fn(),
    });
    const { getByText, getAllByText } = render(<UXSection bucketSize="60s" />);

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
    const { getByText, queryAllByText, getAllByText } = render(<UXSection bucketSize="60s" />);

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
    const { getByText, queryAllByText, getAllByText } = render(<UXSection bucketSize="60s" />);

    expect(getByText('User Experience')).toBeInTheDocument();
    expect(getAllByText('No data is available.')).toHaveLength(3);
    expect(queryAllByText('View in app')).toEqual([]);
    expect(getByText('elastic-co-frontend')).toBeInTheDocument();
  });
});
