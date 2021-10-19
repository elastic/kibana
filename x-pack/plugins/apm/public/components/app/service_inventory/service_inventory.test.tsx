/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { render, waitFor } from '@testing-library/react';
import { CoreStart } from 'kibana/public';
import { merge } from 'lodash';
import React, { ReactNode } from 'react';
import { MemoryRouter } from 'react-router-dom';
import { EuiThemeProvider } from '../../../../../../../src/plugins/kibana_react/common';
import { createKibanaReactContext } from '../../../../../../../src/plugins/kibana_react/public';
import { ServiceHealthStatus } from '../../../../common/service_health_status';
import { ServiceInventory } from '.';
import { ApmPluginContextValue } from '../../../context/apm_plugin/apm_plugin_context';
import {
  mockApmPluginContextValue,
  MockApmPluginContextWrapper,
} from '../../../context/apm_plugin/mock_apm_plugin_context';
import { FETCH_STATUS } from '../../../hooks/use_fetcher';
import { clearCache } from '../../../services/rest/callApi';
import * as useDynamicIndexPatternHooks from '../../../hooks/use_dynamic_index_pattern';
import { SessionStorageMock } from '../../../services/__mocks__/SessionStorageMock';
import { MockUrlParamsContextProvider } from '../../../context/url_params_context/mock_url_params_context_provider';
import * as hook from '../../../context/anomaly_detection_jobs/use_anomaly_detection_jobs_context';
import { TimeRangeComparisonType } from '../../shared/time_comparison/get_time_range_comparison';

const KibanaReactContext = createKibanaReactContext({
  usageCollection: { reportUiCounter: () => {} },
} as Partial<CoreStart>);

const addWarning = jest.fn();
const httpGet = jest.fn();

function wrapper({ children }: { children?: ReactNode }) {
  const mockPluginContext = merge({}, mockApmPluginContextValue, {
    core: {
      http: {
        get: httpGet,
      },
      notifications: {
        toasts: {
          addWarning,
        },
      },
    },
  }) as unknown as ApmPluginContextValue;

  return (
    <MemoryRouter initialEntries={['/services?rangeFrom=now-15m&rangeTo=now']}>
      <EuiThemeProvider>
        <KibanaReactContext.Provider>
          <MockApmPluginContextWrapper value={mockPluginContext}>
            <MockUrlParamsContextProvider
              params={{
                rangeFrom: 'now-15m',
                rangeTo: 'now',
                start: '2021-02-12T13:20:43.344Z',
                end: '2021-02-12T13:20:58.344Z',
                comparisonEnabled: true,
                comparisonType: TimeRangeComparisonType.DayBefore,
              }}
            >
              {children}
            </MockUrlParamsContextProvider>
          </MockApmPluginContextWrapper>
        </KibanaReactContext.Provider>
      </EuiThemeProvider>
    </MemoryRouter>
  );
}

describe('ServiceInventory', () => {
  beforeEach(() => {
    // @ts-expect-error
    global.sessionStorage = new SessionStorageMock();
    clearCache();

    jest.spyOn(hook, 'useAnomalyDetectionJobsContext').mockReturnValue({
      anomalyDetectionJobsData: { jobs: [], hasLegacyJobs: false },
      anomalyDetectionJobsStatus: FETCH_STATUS.SUCCESS,
      anomalyDetectionJobsRefetch: () => {},
    });

    jest
      .spyOn(useDynamicIndexPatternHooks, 'useDynamicIndexPatternFetcher')
      .mockReturnValue({
        indexPattern: undefined,
        status: FETCH_STATUS.SUCCESS,
      });
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  it('should render services, when list is not empty', async () => {
    // mock rest requests
    httpGet
      .mockResolvedValueOnce({ fallbackToTransactions: false })
      .mockResolvedValueOnce({
        hasLegacyData: false,
        hasHistoricalData: true,
        items: [
          {
            serviceName: 'My Python Service',
            agentName: 'python',
            transactionsPerMinute: 100,
            errorsPerMinute: 200,
            avgResponseTime: 300,
            environments: ['test', 'dev'],
            healthStatus: ServiceHealthStatus.warning,
          },
          {
            serviceName: 'My Go Service',
            agentName: 'go',
            transactionsPerMinute: 400,
            errorsPerMinute: 500,
            avgResponseTime: 600,
            environments: [],
            severity: ServiceHealthStatus.healthy,
          },
        ],
      });

    const { container, findByText } = render(<ServiceInventory />, { wrapper });

    // wait for requests to be made
    await waitFor(() => expect(httpGet).toHaveBeenCalledTimes(2));
    await findByText('My Python Service');

    expect(container.querySelectorAll('.euiTableRow')).toHaveLength(2);
  });

  it('should render empty message, when list is empty and historical data is found', async () => {
    httpGet
      .mockResolvedValueOnce({ fallbackToTransactions: false })
      .mockResolvedValueOnce({
        hasLegacyData: false,
        hasHistoricalData: true,
        items: [],
      });

    const { findByText } = render(<ServiceInventory />, { wrapper });

    // wait for requests to be made
    await waitFor(() => expect(httpGet).toHaveBeenCalledTimes(2));
    const noServicesText = await findByText('No services found');

    expect(noServicesText).not.toBeEmptyDOMElement();
  });

  describe('when legacy data is found', () => {
    it('renders an upgrade migration notification', async () => {
      httpGet
        .mockResolvedValueOnce({ fallbackToTransactions: false })
        .mockResolvedValueOnce({
          hasLegacyData: true,
          hasHistoricalData: true,
          items: [],
        });

      render(<ServiceInventory />, { wrapper });

      // wait for requests to be made
      await waitFor(() => expect(httpGet).toHaveBeenCalledTimes(2));

      expect(addWarning).toHaveBeenLastCalledWith(
        expect.objectContaining({
          title: 'Legacy data was detected within the selected time range',
        })
      );
    });
  });

  describe('when legacy data is not found', () => {
    it('does not render an upgrade migration notification', async () => {
      httpGet
        .mockResolvedValueOnce({ fallbackToTransactions: false })
        .mockResolvedValueOnce({
          hasLegacyData: false,
          hasHistoricalData: true,
          items: [],
        });

      render(<ServiceInventory />, { wrapper });

      // wait for requests to be made
      await waitFor(() => expect(httpGet).toHaveBeenCalledTimes(2));

      expect(addWarning).not.toHaveBeenCalled();
    });
  });

  describe('when ML data is not found', () => {
    it('does not render the health column', async () => {
      httpGet
        .mockResolvedValueOnce({ fallbackToTransactions: false })
        .mockResolvedValueOnce({
          hasLegacyData: false,
          hasHistoricalData: true,
          items: [
            {
              serviceName: 'My Python Service',
              agentName: 'python',
              transactionsPerMinute: 100,
              errorsPerMinute: 200,
              avgResponseTime: 300,
              environments: ['test', 'dev'],
            },
          ],
        });

      const { queryByText } = render(<ServiceInventory />, { wrapper });

      // wait for requests to be made
      await waitFor(() => expect(httpGet).toHaveBeenCalledTimes(2));

      expect(queryByText('Health')).toBeNull();
    });
  });

  describe('when ML data is found', () => {
    it('renders the health column', async () => {
      httpGet
        .mockResolvedValueOnce({ fallbackToTransactions: false })
        .mockResolvedValueOnce({
          hasLegacyData: false,
          hasHistoricalData: true,
          items: [
            {
              serviceName: 'My Python Service',
              agentName: 'python',
              transactionsPerMinute: 100,
              errorsPerMinute: 200,
              avgResponseTime: 300,
              environments: ['test', 'dev'],
              healthStatus: ServiceHealthStatus.warning,
            },
          ],
        });

      const { queryAllByText } = render(<ServiceInventory />, { wrapper });

      // wait for requests to be made
      await waitFor(() => expect(httpGet).toHaveBeenCalledTimes(2));

      expect(queryAllByText('Health').length).toBeGreaterThan(1);
    });
  });
});
