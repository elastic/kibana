/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { renderHook } from '@testing-library/react-hooks';
import { createStartServicesMock } from '../../../../common/lib/kibana/kibana_react.mock';
import { useFetchBrowserFieldCapabilities } from './use_fetch_browser_fields_capabilities';
import { BrowserFields } from '@kbn/rule-registry-plugin/common';
import { AlertsField } from '../../../../types';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const mockUseKibanaReturnValue = createStartServicesMock();
jest.mock('@kbn/kibana-react-plugin/public', () => ({
  __esModule: true,
  useKibana: jest.fn(() => ({
    services: mockUseKibanaReturnValue,
  })),
}));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,
      cacheTime: 0,
    },
  },
});

const browserFields: BrowserFields = {
  kibana: {
    fields: {
      [AlertsField.uuid]: {
        category: 'kibana',
        name: AlertsField.uuid,
      },
      [AlertsField.name]: {
        category: 'kibana',
        name: AlertsField.name,
      },
      [AlertsField.reason]: {
        category: 'kibana',
        name: AlertsField.reason,
      },
    },
  },
};

describe('useFetchBrowserFieldCapabilities', () => {
  const MOCKED_DATA_VIEW = {
    id: 'fakeId',
    fields: [{ name: 'fakeField' }],
  };
  const wrapper: React.FunctionComponent = ({ children }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );

  beforeEach(() => {
    mockUseKibanaReturnValue.http.get = jest.fn().mockReturnValue({
      index_name: [
        '.alerts-observability.uptime.alerts-*',
        '.alerts-observability.metrics.alerts-*',
        '.alerts-observability.logs.alerts-*',
        '.alerts-observability.apm.alerts-*',
      ],
    });
    mockUseKibanaReturnValue.data.dataViews.create = jest.fn().mockReturnValue(MOCKED_DATA_VIEW);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should not fetch for siem', () => {
    const { result } = renderHook(
      () =>
        useFetchBrowserFieldCapabilities({
          featureIds: ['siem'],
        }),
      { wrapper }
    );

    expect(mockUseKibanaReturnValue.http.get).toHaveBeenCalledTimes(0);
    expect(result.current).toEqual([undefined, {}]);
  });

  it('should call the api only once', async () => {
    const { result, waitFor, rerender } = renderHook(
      () => useFetchBrowserFieldCapabilities({ featureIds: ['apm'] }),
      { wrapper }
    );

    await waitFor(() => result.current[0] === false);

    expect(mockUseKibanaReturnValue.http.get).toHaveBeenCalledTimes(1);
    expect(result.current).toEqual([
      false,
      { base: { fields: { fakeField: { name: 'fakeField' } } } },
    ]);

    rerender();

    expect(mockUseKibanaReturnValue.http.get).toHaveBeenCalledTimes(1);
    expect(result.current).toEqual([
      false,
      { base: { fields: { fakeField: { name: 'fakeField' } } } },
    ]);
  });

  it('should not fetch if browserFields have been provided', () => {
    const { result } = renderHook(
      () =>
        useFetchBrowserFieldCapabilities({
          featureIds: ['apm'],
          initialBrowserFields: browserFields,
        }),
      { wrapper }
    );

    expect(mockUseKibanaReturnValue.http.get).toHaveBeenCalledTimes(0);
    expect(result.current).toEqual([undefined, browserFields]);
  });
});
