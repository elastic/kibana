/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, waitFor } from '@testing-library/react';
import { CoreStart } from '@kbn/core/public';
import { AppMountParameters } from '@kbn/core/public';
import { TimeBuckets } from '@kbn/data-plugin/common';
import { fetchActiveMaintenanceWindows } from '@kbn/alerts-ui-shared/src/maintenance_window_callout/api';
import { RUNNING_MAINTENANCE_WINDOW_1 } from '@kbn/alerts-ui-shared/src/maintenance_window_callout/mock';
import { KibanaPageTemplate } from '@kbn/shared-ux-page-kibana-template';
import { __IntlProvider as IntlProvider } from '@kbn/i18n-react';
import { MAINTENANCE_WINDOW_FEATURE_ID } from '@kbn/alerting-plugin/common/maintenance_window';

import { ObservabilityPublicPluginsStart } from '../../plugin';
import { AlertsPage } from './alerts';
import { kibanaStartMock } from '../../utils/kibana_react.mock';
import * as pluginContext from '../../hooks/use_plugin_context';
import * as dataContext from '../../hooks/use_has_data';
import { createObservabilityRuleTypeRegistryMock } from '../../rules/observability_rule_type_registry_mock';
import { ThemeProvider } from '@emotion/react';
import { euiDarkVars } from '@kbn/ui-theme';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const mockUseKibanaReturnValue = kibanaStartMock.startContract();
mockUseKibanaReturnValue.services.application.capabilities = {
  ...mockUseKibanaReturnValue.services.application.capabilities,
  [MAINTENANCE_WINDOW_FEATURE_ID]: {
    save: true,
    show: true,
  },
};

jest.mock('../../utils/kibana_react', () => ({
  __esModule: true,
  useKibana: jest.fn(() => mockUseKibanaReturnValue),
}));
jest.mock('@kbn/kibana-react-plugin/public', () => ({
  __esModule: true,
  useKibana: jest.fn(() => mockUseKibanaReturnValue),
}));
jest.mock('@kbn/observability-shared-plugin/public');
jest.spyOn(pluginContext, 'usePluginContext').mockImplementation(() => ({
  appMountParameters: {
    setHeaderActionMenu: () => {},
  } as unknown as AppMountParameters,
  config: {
    unsafe: {
      slo: { enabled: false },
      alertDetails: {
        apm: { enabled: false },
        logs: { enabled: false },
        metrics: { enabled: false },
        uptime: { enabled: false },
        observability: { enabled: false },
      },
      thresholdRule: { enabled: false },
    },
    aiAssistant: {
      enabled: false,
      feedback: {
        enabled: false,
      },
    },
  },
  observabilityRuleTypeRegistry: createObservabilityRuleTypeRegistryMock(),
  ObservabilityPageTemplate: KibanaPageTemplate,
  kibanaFeatures: [],
  core: {} as CoreStart,
  plugins: {} as ObservabilityPublicPluginsStart,
  hasAnyData: true,
  isAllRequestsComplete: true,
}));

jest.spyOn(dataContext, 'useHasData').mockImplementation(() => ({
  hasDataMap: {},
  hasAnyData: true,
  isAllRequestsComplete: true,
  onRefreshTimeRange: jest.fn(),
  forceUpdate: 'false',
}));

jest.mock('@kbn/alerts-ui-shared/src/maintenance_window_callout/api', () => ({
  fetchActiveMaintenanceWindows: jest.fn(() => Promise.resolve([])),
}));
const fetchActiveMaintenanceWindowsMock = fetchActiveMaintenanceWindows as jest.Mock;

jest.mock('../../hooks/use_time_buckets', () => ({
  useTimeBuckets: jest.fn(),
}));

jest.mock('../../hooks/use_has_data', () => ({
  useHasData: jest.fn(),
}));

const { useTimeBuckets } = jest.requireMock('../../hooks/use_time_buckets');
const { useHasData } = jest.requireMock('../../hooks/use_has_data');

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,
      cacheTime: 0,
    },
  },
});
function AllTheProviders({ children }: { children: any }) {
  return (
    <ThemeProvider
      theme={() => ({ eui: { ...euiDarkVars, euiColorLightShade: '#ece' }, darkMode: true })}
    >
      <IntlProvider locale="en">
        <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
      </IntlProvider>
    </ThemeProvider>
  );
}

describe('AlertsPage with all capabilities', () => {
  const timeBuckets = new TimeBuckets({
    'histogram:maxBars': 12,
    'histogram:barTarget': 10,
    dateFormat: 'MMM D, YYYY @ HH:mm:ss.SSS',
    'dateFormat:scaled': [
      ['', 'HH:mm:ss.SSS'],
      ['PT1S', 'HH:mm:ss'],
      ['PT1M', 'HH:mm'],
      ['PT1H', 'YYYY-MM-DD HH:mm'],
      ['P1DT', 'YYYY-MM-DD'],
      ['P1YT', 'YYYY'],
    ],
  });

  async function setup() {
    return render(<AlertsPage />, { wrapper: AllTheProviders });
  }

  beforeAll(() => {
    fetchActiveMaintenanceWindowsMock.mockResolvedValue([]);
    useHasData.mockReturnValue({
      hasDataMap: {
        apm: { hasData: true, status: 'success' },
        synthetics: { hasData: true, status: 'success' },
        infra_logs: { hasData: undefined, status: 'success' },
        infra_metrics: { hasData: true, status: 'success' },
        ux: { hasData: undefined, status: 'success' },
        alert: { hasData: false, status: 'success' },
      },
      hasAnyData: true,
      isAllRequestsComplete: true,
      onRefreshTimeRange: () => {},
      forceUpdate: '',
    });
  });

  beforeEach(() => {
    fetchActiveMaintenanceWindowsMock.mockClear();
    useTimeBuckets.mockReturnValue(timeBuckets);
  });

  it('should render an alerts page template', async () => {
    const wrapper = await setup();
    await waitFor(() => {
      expect(wrapper.getByText('Alerts')).toBeInTheDocument();
    });
  });

  it('renders MaintenanceWindowCallout if one exists', async () => {
    fetchActiveMaintenanceWindowsMock.mockResolvedValue([
      {
        ...RUNNING_MAINTENANCE_WINDOW_1,
        categoryIds: ['observability'],
      },
    ]);
    const wrapper = await setup();

    await waitFor(() => {
      expect(wrapper.getByTestId('maintenanceWindowCallout')).toBeInTheDocument();
      expect(fetchActiveMaintenanceWindowsMock).toHaveBeenCalledTimes(1);
    });
  });
});
