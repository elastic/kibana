/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { AlertConsumers } from '@kbn/rule-data-utils';
import { createStartServicesMock } from '../../common/lib/kibana/kibana_react.mock';
import type { ValidFeatureId } from '@kbn/rule-data-utils';
import { act, renderHook } from '@testing-library/react-hooks';
import { useAlertDataViews } from './use_alert_data_view';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';

const mockUseKibanaReturnValue = createStartServicesMock();

jest.mock('@kbn/kibana-react-plugin/public', () => ({
  __esModule: true,
  useKibana: jest.fn(() => ({
    services: mockUseKibanaReturnValue,
  })),
}));

jest.mock('../lib/rule_api/alert_index', () => ({
  fetchAlertIndexNames: jest.fn(),
}));

const { fetchAlertIndexNames } = jest.requireMock('../lib/rule_api/alert_index');

jest.mock('../lib/rule_api/alert_fields', () => ({
  fetchAlertFields: jest.fn(),
}));
const { fetchAlertFields } = jest.requireMock('../lib/rule_api/alert_fields');

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,
      cacheTime: 0,
    },
  },
});
const wrapper = ({ children }: { children: Node }) => (
  <QueryClientProvider client={queryClient}> {children} </QueryClientProvider>
);

describe('useAlertDataView', () => {
  const observabilityAlertFeatureIds: ValidFeatureId[] = [
    AlertConsumers.APM,
    AlertConsumers.INFRASTRUCTURE,
    AlertConsumers.LOGS,
    AlertConsumers.UPTIME,
  ];

  beforeEach(() => {
    fetchAlertIndexNames.mockResolvedValue([
      '.alerts-observability.uptime.alerts-*',
      '.alerts-observability.metrics.alerts-*',
      '.alerts-observability.logs.alerts-*',
      '.alerts-observability.apm.alerts-*',
    ]);
    fetchAlertFields.mockResolvedValue([{ data: ' fields' }]);
  });

  afterEach(() => {
    queryClient.clear();
    jest.clearAllMocks();
  });

  it('initially is loading and does not have data', async () => {
    await act(async () => {
      const mockedAsyncDataView = {
        loading: true,
        dataview: undefined,
      };

      const { result, waitForNextUpdate } = renderHook(
        () => useAlertDataViews(observabilityAlertFeatureIds),
        {
          wrapper,
        }
      );

      await waitForNextUpdate();

      expect(result.current).toEqual(mockedAsyncDataView);
    });
  });

  it('fetch index names + fields for the provided o11y featureIds', async () => {
    await act(async () => {
      const { waitForNextUpdate } = renderHook(
        () => useAlertDataViews(observabilityAlertFeatureIds),
        {
          wrapper,
        }
      );

      await waitForNextUpdate();
      await waitForNextUpdate();

      expect(fetchAlertIndexNames).toHaveBeenCalledTimes(1);
      expect(fetchAlertFields).toHaveBeenCalledTimes(1);
    });
  });

  it('only fetch index names for security featureId', async () => {
    await act(async () => {
      const { waitForNextUpdate } = renderHook(() => useAlertDataViews([AlertConsumers.SIEM]), {
        wrapper,
      });

      await waitForNextUpdate();
      await waitForNextUpdate();

      expect(fetchAlertIndexNames).toHaveBeenCalledTimes(1);
      expect(fetchAlertFields).toHaveBeenCalledTimes(0);
    });
  });

  it('Do not fetch anything if security and o11y featureIds are mix together', async () => {
    await act(async () => {
      const { result, waitForNextUpdate } = renderHook(
        () => useAlertDataViews([AlertConsumers.SIEM, AlertConsumers.LOGS]),
        {
          wrapper,
        }
      );

      await waitForNextUpdate();

      expect(fetchAlertIndexNames).toHaveBeenCalledTimes(0);
      expect(fetchAlertFields).toHaveBeenCalledTimes(0);
      expect(result.current).toEqual({
        loading: false,
        dataview: undefined,
      });
    });
  });

  it('if fetch throw error return no data', async () => {
    fetchAlertIndexNames.mockRejectedValue('error');

    await act(async () => {
      const { result, waitForNextUpdate } = renderHook(
        () => useAlertDataViews(observabilityAlertFeatureIds),
        {
          wrapper,
        }
      );

      await waitForNextUpdate();
      await waitForNextUpdate();

      expect(result.current).toEqual({
        loading: false,
        dataview: undefined,
      });
    });
  });
});
