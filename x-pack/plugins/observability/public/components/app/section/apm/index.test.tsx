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
import * as hasDataHook from '../../../../hooks/use_has_data';
import * as pluginContext from '../../../../hooks/use_plugin_context';
import { HasDataContextValue } from '../../../../context/has_data_context';
import { AppMountParameters, CoreStart } from 'kibana/public';
import { ObservabilityPluginSetupDeps } from '../../../../plugin';

jest.mock('react-router-dom', () => ({
  useLocation: () => ({
    pathname: '/observability/overview/',
    search: '',
  }),
  useHistory: jest.fn(),
}));

describe('APMSection', () => {
  beforeAll(() => {
    jest.spyOn(hasDataHook, 'useHasData').mockReturnValue({
      hasData: {
        apm: {
          status: fetcherHook.FETCH_STATUS.SUCCESS,
          hasData: true,
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
  it('renders with transaction series and stats', () => {
    jest.spyOn(fetcherHook, 'useFetcher').mockReturnValue({
      data: response,
      status: fetcherHook.FETCH_STATUS.SUCCESS,
      refetch: jest.fn(),
    });
    const { getByText, queryAllByTestId } = render(<APMSection bucketSize="60s" />);

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
    const { getByText, queryAllByText, getByTestId } = render(<APMSection bucketSize="60s" />);

    expect(getByText('APM')).toBeInTheDocument();
    expect(getByTestId('loading')).toBeInTheDocument();
    expect(queryAllByText('View in app')).toEqual([]);
    expect(queryAllByText('Services 11')).toEqual([]);
    expect(queryAllByText('Transactions per minute 312.00k')).toEqual([]);
  });
});
