/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { ReactNode } from 'react';
import { MemoryRouter } from 'react-router-dom';
import { CoreStart } from 'src/core/public';
import { createKibanaReactContext } from '../../../../../../../src/plugins/kibana_react/public';
import { ApmPluginContextValue } from '../../../context/apm_plugin/apm_plugin_context';
import {
  mockApmPluginContextValue,
  MockApmPluginContextWrapper,
} from '../../../context/apm_plugin/mock_apm_plugin_context';
import { MockUrlParamsContextProvider } from '../../../context/url_params_context/mock_url_params_context_provider';
import * as useDynamicIndexPatternHooks from '../../../hooks/use_dynamic_index_pattern';
import { FETCH_STATUS } from '../../../hooks/use_fetcher';
import * as useAnnotationsHooks from '../../../context/annotations/use_annotations_context';
import * as useTransactionBreakdownHooks from '../../shared/charts/transaction_breakdown_chart/use_transaction_breakdown';
import { renderWithTheme } from '../../../utils/testHelpers';
import { ServiceOverview } from './';
import { waitFor } from '@testing-library/dom';
import * as callApmApiModule from '../../../services/rest/createCallApmApi';
import * as useApmServiceContextHooks from '../../../context/apm_service/use_apm_service_context';
import { LatencyAggregationType } from '../../../../common/latency_aggregation_types';

const KibanaReactContext = createKibanaReactContext({
  usageCollection: { reportUiCounter: () => {} },
} as Partial<CoreStart>);

function Wrapper({ children }: { children?: ReactNode }) {
  const value = ({
    ...mockApmPluginContextValue,
    core: {
      ...mockApmPluginContextValue.core,
      http: {
        basePath: { prepend: () => {} },
        get: () => {},
      },
    },
  } as unknown) as ApmPluginContextValue;

  return (
    <MemoryRouter keyLength={0}>
      <KibanaReactContext.Provider>
        <MockApmPluginContextWrapper value={value}>
          <MockUrlParamsContextProvider
            params={{
              rangeFrom: 'now-15m',
              rangeTo: 'now',
              latencyAggregationType: LatencyAggregationType.avg,
            }}
          >
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
        agentName: 'java',
        transactionType: 'request',
        transactionTypes: ['request'],
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

    const calls = {
      // eslint-disable-next-line @typescript-eslint/naming-convention
      'GET /api/apm/services/{serviceName}/error_groups': {
        error_groups: [],
        total_error_groups: 0,
      },
      'GET /api/apm/services/{serviceName}/transactions/groups/overview': {
        transactionGroups: [],
        totalTransactionGroups: 0,
        isAggregationAccurate: true,
      },
      'GET /api/apm/services/{serviceName}/dependencies': [],
      // eslint-disable-next-line @typescript-eslint/naming-convention
      'GET /api/apm/services/{serviceName}/service_overview_instances': [],
    };

    jest
      .spyOn(callApmApiModule, 'createCallApmApi')
      .mockImplementation(() => {});

    const callApmApi = jest
      .spyOn(callApmApiModule, 'callApmApi')
      .mockImplementation(({ endpoint }) => {
        const response = calls[endpoint as keyof typeof calls];

        return response
          ? Promise.resolve(response)
          : Promise.reject(`Response for ${endpoint} is not defined`);
      });
    jest
      .spyOn(useTransactionBreakdownHooks, 'useTransactionBreakdown')
      .mockReturnValue({
        data: { timeseries: [] },
        error: undefined,
        status: FETCH_STATUS.SUCCESS,
      });

    const { findAllByText } = renderWithTheme(
      <ServiceOverview serviceName="test service name" />,
      {
        wrapper: Wrapper,
      }
    );

    await waitFor(() =>
      expect(callApmApi).toHaveBeenCalledTimes(Object.keys(calls).length)
    );

    expect((await findAllByText('Latency')).length).toBeGreaterThan(0);
  });
});
