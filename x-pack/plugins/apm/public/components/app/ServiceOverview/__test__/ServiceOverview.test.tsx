/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { render, wait, waitForElement } from '@testing-library/react';
import { CoreStart } from 'kibana/public';
import React, { FunctionComponent, ReactChild } from 'react';
import { createKibanaReactContext } from 'src/plugins/kibana_react/public';
import { merge } from 'lodash';
import { ServiceOverview } from '..';
import { ApmPluginContextValue } from '../../../../context/ApmPluginContext';
import {
  mockApmPluginContextValue,
  MockApmPluginContextWrapper,
} from '../../../../context/ApmPluginContext/MockApmPluginContext';
import { FETCH_STATUS } from '../../../../hooks/useFetcher';
import * as useLocalUIFilters from '../../../../hooks/useLocalUIFilters';
import * as urlParamsHooks from '../../../../hooks/useUrlParams';
import * as useAnomalyDetectionJobs from '../../../../hooks/useAnomalyDetectionJobs';
import { SessionStorageMock } from '../../../../services/__test__/SessionStorageMock';
import { EuiThemeProvider } from '../../../../../../../legacy/common/eui_styled_components';

const KibanaReactContext = createKibanaReactContext({
  usageCollection: { reportUiStats: () => {} },
} as Partial<CoreStart>);

const addWarning = jest.fn();
const httpGet = jest.fn();

function wrapper({ children }: { children: ReactChild }) {
  const mockPluginContext = (merge({}, mockApmPluginContextValue, {
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
  }) as unknown) as ApmPluginContextValue;

  return (
    <KibanaReactContext.Provider>
      <EuiThemeProvider>
        <MockApmPluginContextWrapper value={mockPluginContext as any}>
          {children}
        </MockApmPluginContextWrapper>
      </EuiThemeProvider>
    </KibanaReactContext.Provider>
  );
}

function renderServiceOverview() {
  return render(<ServiceOverview />, { wrapper } as {
    wrapper: FunctionComponent<{}>;
  });
}

describe('Service Overview -> View', () => {
  beforeEach(() => {
    // @ts-expect-error
    global.sessionStorage = new SessionStorageMock();

    // mock urlParams
    jest.spyOn(urlParamsHooks, 'useUrlParams').mockReturnValue({
      urlParams: {
        start: 'myStart',
        end: 'myEnd',
      },
      refreshTimeRange: jest.fn(),
      uiFilters: {},
    });

    jest.spyOn(useLocalUIFilters, 'useLocalUIFilters').mockReturnValue({
      filters: [],
      setFilterValue: () => null,
      clearValues: () => null,
      status: FETCH_STATUS.SUCCESS,
    });

    jest
      .spyOn(useAnomalyDetectionJobs, 'useAnomalyDetectionJobs')
      .mockReturnValue({
        status: FETCH_STATUS.SUCCESS,
        data: {
          jobs: [],
          hasLegacyJobs: false,
        },
        refetch: () => undefined,
      });
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  it('should render services, when list is not empty', async () => {
    // mock rest requests
    httpGet.mockResolvedValueOnce({
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
          severity: 1,
        },
        {
          serviceName: 'My Go Service',
          agentName: 'go',
          transactionsPerMinute: 400,
          errorsPerMinute: 500,
          avgResponseTime: 600,
          environments: [],
          severity: 10,
        },
      ],
    });

    const { container, getByText } = renderServiceOverview();

    // wait for requests to be made
    await wait(() => expect(httpGet).toHaveBeenCalledTimes(1));
    await waitForElement(() => getByText('My Python Service'));

    expect(container.querySelectorAll('.euiTableRow')).toMatchSnapshot();
  });

  it('should render getting started message, when list is empty and no historical data is found', async () => {
    httpGet.mockResolvedValueOnce({
      hasLegacyData: false,
      hasHistoricalData: false,
      items: [],
    });

    const { container, getByText } = renderServiceOverview();

    // wait for requests to be made
    await wait(() => expect(httpGet).toHaveBeenCalledTimes(1));

    // wait for elements to be rendered
    await waitForElement(() =>
      getByText(
        "Looks like you don't have any APM services installed. Let's add some!"
      )
    );

    expect(container.querySelectorAll('.euiTableRow')).toMatchSnapshot();
  });

  it('should render empty message, when list is empty and historical data is found', async () => {
    httpGet.mockResolvedValueOnce({
      hasLegacyData: false,
      hasHistoricalData: true,
      items: [],
    });

    const { container, getByText } = renderServiceOverview();

    // wait for requests to be made
    await wait(() => expect(httpGet).toHaveBeenCalledTimes(1));
    await waitForElement(() => getByText('No services found'));

    expect(container.querySelectorAll('.euiTableRow')).toMatchSnapshot();
  });

  describe('when legacy data is found', () => {
    it('renders an upgrade migration notification', async () => {
      httpGet.mockResolvedValueOnce({
        hasLegacyData: true,
        hasHistoricalData: true,
        items: [],
      });

      renderServiceOverview();

      // wait for requests to be made
      await wait(() => expect(httpGet).toHaveBeenCalledTimes(1));

      expect(addWarning).toHaveBeenLastCalledWith(
        expect.objectContaining({
          title: 'Legacy data was detected within the selected time range',
        })
      );
    });
  });

  describe('when legacy data is not found', () => {
    it('does not render an upgrade migration notification', async () => {
      httpGet.mockResolvedValueOnce({
        hasLegacyData: false,
        hasHistoricalData: true,
        items: [],
      });

      renderServiceOverview();

      // wait for requests to be made
      await wait(() => expect(httpGet).toHaveBeenCalledTimes(1));

      expect(addWarning).not.toHaveBeenCalled();
    });
  });

  describe('when ML data is not found', () => {
    it('does not render the health column', async () => {
      httpGet.mockResolvedValueOnce({
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

      const { queryByText } = renderServiceOverview();

      // wait for requests to be made
      await wait(() => expect(httpGet).toHaveBeenCalledTimes(1));

      expect(queryByText('Health')).toBeNull();
    });
  });

  describe('when ML data is found', () => {
    it('renders the health column', async () => {
      httpGet.mockResolvedValueOnce({
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
            severity: 1,
          },
        ],
      });

      const { queryAllByText } = renderServiceOverview();

      // wait for requests to be made
      await wait(() => expect(httpGet).toHaveBeenCalledTimes(1));

      expect(queryAllByText('Health').length).toBeGreaterThan(1);
    });
  });
});
