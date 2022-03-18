/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import * as fetcherHook from '../../../../hooks/use_fetcher';
import { render, data as dataMock } from '../../../../utils/test_helper';
import { APMSection } from './';
import { response } from './mock_data/apm.mock';
import * as hasDataHook from '../../../../hooks/use_has_data';
import * as pluginContext from '../../../../hooks/use_plugin_context';
import { HasDataContextValue } from '../../../../context/has_data_context';
import { AppMountParameters } from 'kibana/public';
import { createObservabilityRuleTypeRegistryMock } from '../../../../rules/observability_rule_type_registry_mock';
import { KibanaPageTemplate } from '../../../../../../../../src/plugins/kibana_react/public';

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
      hasDataMap: {
        apm: {
          status: fetcherHook.FETCH_STATUS.SUCCESS,
          hasData: true,
        },
      },
    } as HasDataContextValue);

    // @ts-expect-error `dataMock` is not properly propagating the mock types
    dataMock.query.timefilter.timefilter.getTime.mockReturnValue({
      from: '2020-10-08T06:00:00.000Z',
      to: '2020-10-08T07:00:00.000Z',
    });

    jest.spyOn(pluginContext, 'usePluginContext').mockImplementation(() => ({
      appMountParameters: {} as AppMountParameters,
      config: {
        unsafe: {
          alertingExperience: { enabled: true },
          cases: { enabled: true },
          overviewNext: { enabled: false },
          rules: { enabled: false },
        },
      },
      observabilityRuleTypeRegistry: createObservabilityRuleTypeRegistryMock(),
      ObservabilityPageTemplate: KibanaPageTemplate,
    }));
  });

  it('renders transaction stat less than 1k', () => {
    const resp = {
      appLink: '/app/apm',
      stats: {
        services: { value: 11, type: 'number' },
        transactions: { value: 900, type: 'number' },
      },
      series: {
        transactions: { coordinates: [] },
      },
    };
    jest.spyOn(fetcherHook, 'useFetcher').mockReturnValue({
      data: resp,
      status: fetcherHook.FETCH_STATUS.SUCCESS,
      refetch: jest.fn(),
    });
    const { getByRole, getByText, queryAllByTestId } = render(
      <APMSection bucketSize={{ intervalString: '60s', bucketSize: 60 }} />
    );

    expect(getByRole('heading')).toHaveTextContent('Services');
    expect(getByText('Show service inventory')).toBeInTheDocument();
    expect(getByText('Services 11')).toBeInTheDocument();
    expect(getByText('900.0 tpm')).toBeInTheDocument();
    expect(queryAllByTestId('loading')).toEqual([]);
  });

  it('renders with transaction series and stats', () => {
    jest.spyOn(fetcherHook, 'useFetcher').mockReturnValue({
      data: response,
      status: fetcherHook.FETCH_STATUS.SUCCESS,
      refetch: jest.fn(),
    });
    const { getByRole, getByText, queryAllByTestId } = render(
      <APMSection bucketSize={{ intervalString: '60s', bucketSize: 60 }} />
    );

    expect(getByRole('heading')).toHaveTextContent('Services');
    expect(getByText('Show service inventory')).toBeInTheDocument();
    expect(getByText('Services 11')).toBeInTheDocument();
    expect(getByText('312.00k tpm')).toBeInTheDocument();
    expect(queryAllByTestId('loading')).toEqual([]);
  });
  it('shows loading state', () => {
    jest.spyOn(fetcherHook, 'useFetcher').mockReturnValue({
      data: undefined,
      status: fetcherHook.FETCH_STATUS.LOADING,
      refetch: jest.fn(),
    });
    const { getByRole, queryAllByText, getByTestId } = render(
      <APMSection bucketSize={{ intervalString: '60s', bucketSize: 60 }} />
    );

    expect(getByRole('heading')).toHaveTextContent('Services');
    expect(getByTestId('loading')).toBeInTheDocument();
    expect(queryAllByText('Show service inventory')).toEqual([]);
    expect(queryAllByText('Services 11')).toEqual([]);
    expect(queryAllByText('312.00k tpm')).toEqual([]);
  });
});
