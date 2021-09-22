/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { ReactNode } from 'react';
import { MemoryRouter } from 'react-router-dom';
import { CoreStart } from 'src/core/public';
import { isEqual } from 'lodash';
import { createKibanaReactContext } from '../../../../../../../src/plugins/kibana_react/public';
import { ApmPluginContextValue } from '../../../context/apm_plugin/apm_plugin_context';
import {
  mockApmPluginContextValue,
  MockApmPluginContextWrapper,
} from '../../../context/apm_plugin/mock_apm_plugin_context';
import * as useDynamicIndexPatternHooks from '../../../hooks/use_dynamic_index_pattern';
import { FETCH_STATUS } from '../../../hooks/use_fetcher';
import * as useAnnotationsHooks from '../../../context/annotations/use_annotations_context';
import * as useTransactionBreakdownHooks from '../../shared/charts/transaction_breakdown_chart/use_transaction_breakdown';
import { renderWithTheme } from '../../../utils/testHelpers';
import { ServiceOverview } from './';
import { waitFor } from '@testing-library/dom';
import * as useApmServiceContextHooks from '../../../context/apm_service/use_apm_service_context';
import { LatencyAggregationType } from '../../../../common/latency_aggregation_types';
import {
  getCallApmApiSpy,
  getCreateCallApmApiSpy,
} from '../../../services/rest/callApmApiSpy';
import { fromQuery } from '../../shared/Links/url_helpers';
import { MockUrlParamsContextProvider } from '../../../context/url_params_context/mock_url_params_context_provider';
import { uiSettingsServiceMock } from '../../../../../../../src/core/public/mocks';

const uiSettings = uiSettingsServiceMock.create().setup({} as any);

const KibanaReactContext = createKibanaReactContext({
  notifications: { toasts: { add: () => {} } },
  uiSettings,
  usageCollection: { reportUiCounter: () => {} },
} as unknown as Partial<CoreStart>);

const mockParams = {
  rangeFrom: 'now-15m',
  rangeTo: 'now',
  latencyAggregationType: LatencyAggregationType.avg,
};

const location = {
  pathname: '/services/test%20service%20name/overview',
  search: fromQuery(mockParams),
};

function Wrapper({ children }: { children?: ReactNode }) {
  const value = {
    ...mockApmPluginContextValue,
    core: {
      ...mockApmPluginContextValue.core,
      http: {
        basePath: { prepend: () => {} },
        get: () => {},
      },
    },
  } as unknown as ApmPluginContextValue;

  return (
    <MemoryRouter initialEntries={[location]}>
      <KibanaReactContext.Provider>
        <MockApmPluginContextWrapper value={value}>
          <MockUrlParamsContextProvider params={mockParams}>
            {children}
          </MockUrlParamsContextProvider>
        </MockApmPluginContextWrapper>
      </KibanaReactContext.Provider>
    </MemoryRouter>
  );
}

describe('ServiceOverview', () => {
  it('renders', async () => {
    jest
      .spyOn(useApmServiceContextHooks, 'useApmServiceContext')
      .mockReturnValue({
        serviceName: 'test service name',
        agentName: 'java',
        transactionType: 'request',
        transactionTypes: ['request'],
        alerts: [],
      });
    jest
      .spyOn(useAnnotationsHooks, 'useAnnotationsContext')
      .mockReturnValue({ annotations: [] });
    jest
      .spyOn(useDynamicIndexPatternHooks, 'useDynamicIndexPatternFetcher')
      .mockReturnValue({
        indexPattern: undefined,
        status: FETCH_STATUS.SUCCESS,
      });

    /* eslint-disable @typescript-eslint/naming-convention */
    const calls = {
      'GET /api/apm/services/{serviceName}/error_groups/main_statistics': {
        error_groups: [] as any[],
      },
      'GET /api/apm/services/{serviceName}/transactions/groups/main_statistics':
        {
          transactionGroups: [] as any[],
          totalTransactionGroups: 0,
          isAggregationAccurate: true,
        },
      'GET /api/apm/services/{serviceName}/dependencies': {
        serviceDependencies: [],
      },
      'GET /api/apm/services/{serviceName}/service_overview_instances/main_statistics':
        [],
      'GET /api/apm/services/{serviceName}/transactions/charts/latency': {
        currentPeriod: {
          overallAvgDuration: null,
          latencyTimeseries: [],
        },
        previousPeriod: {
          overallAvgDuration: null,
          latencyTimeseries: [],
        },
      },
      'GET /api/apm/services/{serviceName}/throughput': {
        currentPeriod: [],
        previousPeriod: [],
      },
      'GET /api/apm/services/{serviceName}/transactions/charts/error_rate': {
        currentPeriod: {
          transactionErrorRate: [],
          noHits: true,
          average: null,
        },
        previousPeriod: {
          transactionErrorRate: [],
          noHits: true,
          average: null,
        },
      },
      'GET /api/apm/services/{serviceName}/annotation/search': {
        annotations: [],
      },
      'GET /api/apm/fallback_to_transactions': {
        fallbackToTransactions: false,
      },
    };
    /* eslint-enable @typescript-eslint/naming-convention */

    const callApmApiSpy = getCallApmApiSpy().mockImplementation(
      ({ endpoint }) => {
        const response = calls[endpoint as keyof typeof calls];

        return response
          ? Promise.resolve(response)
          : Promise.reject(`Response for ${endpoint} is not defined`);
      }
    );

    getCreateCallApmApiSpy().mockImplementation(() => callApmApiSpy as any);
    jest
      .spyOn(useTransactionBreakdownHooks, 'useTransactionBreakdown')
      .mockReturnValue({
        data: { timeseries: [] },
        error: undefined,
        status: FETCH_STATUS.SUCCESS,
      });

    const { findAllByText } = renderWithTheme(<ServiceOverview />, {
      wrapper: Wrapper,
    });

    await waitFor(() => {
      const endpoints = callApmApiSpy.mock.calls.map(
        (call) => call[0].endpoint
      );
      return isEqual(endpoints.sort(), Object.keys(calls).sort());
    });

    expect((await findAllByText('Latency')).length).toBeGreaterThan(0);
  });
});
