/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { KibanaContextProvider } from '@kbn/kibana-react-plugin/public';
import { Meta, Story } from '@storybook/react';
import React from 'react';
import { MemoryRouter } from 'react-router-dom';
import { LatencyChart } from '.';
import { LatencyAggregationType } from '../../../../../common/latency_aggregation_types';
import type { ApmPluginContextValue } from '../../../../context/apm_plugin/apm_plugin_context';
import { MockApmPluginContextWrapper } from '../../../../context/apm_plugin/mock_apm_plugin_context';
import { APMServiceContext } from '../../../../context/apm_service/apm_service_context';
import { ChartPointerEventContextProvider } from '../../../../context/chart_pointer_event/chart_pointer_event_context';
import { MockTimeRangeContextProvider } from '../../../../context/time_range_metadata/mock_time_range_metadata_context_provider';
import { ApmTimeRangeMetadataContextProvider } from '../../../../context/time_range_metadata/time_range_metadata_context';
import { MockUrlParamsContextProvider } from '../../../../context/url_params_context/mock_url_params_context_provider';
import { FETCH_STATUS } from '../../../../hooks/use_fetcher';
import { mockApmApiCallResponse } from '../../../../services/rest/call_apm_api_spy';
import { APIReturnType, createCallApmApi } from '../../../../services/rest/create_call_apm_api';
import latencyChartResponseJson from './latency_chart_response.json';

interface Args {
  latencyChartResponse: APIReturnType<'GET /internal/apm/services/{serviceName}/transactions/charts/latency'>;
}

const stories: Meta<Args> = {
  title: 'shared/charts/LatencyChart',
  component: LatencyChart,
  argTypes: {
    latencyChartResponse: {
      control: {
        type: 'object',
      },
    },
  },
  decorators: [
    (StoryComponent, { args }) => {
      const { latencyChartResponse } = args as Args;
      const serviceName = 'testService';

      const apmPluginContextMock = {
        core: {
          notifications: {
            toasts: { addWarning: () => {}, addDanger: () => {} },
          },
          uiSettings: { get: () => '' },
        },
        plugins: {},
        observabilityRuleTypeRegistry: { getFormatter: () => undefined },
      } as unknown as ApmPluginContextValue;

      createCallApmApi(apmPluginContextMock.core);

      mockApmApiCallResponse(
        'GET /internal/apm/services/{serviceName}/transactions/charts/latency',
        () => {
          return latencyChartResponse;
        }
      );

      const transactionType = `${Math.random()}`; // So we don't memoize

      return (
        <MemoryRouter
          initialEntries={[
            `/services/${serviceName}/overview?environment=ENVIRONMENT_ALL&kuery=&rangeFrom=now-15m&rangeTo=now&transactionType=request&comparisonEnabled=true&offset=1d`,
          ]}
        >
          <MockApmPluginContextWrapper value={apmPluginContextMock}>
            <KibanaContextProvider services={{ ...apmPluginContextMock.core }}>
              <MockUrlParamsContextProvider
                params={{
                  latencyAggregationType: LatencyAggregationType.avg,
                }}
              >
                <MockTimeRangeContextProvider>
                  <ApmTimeRangeMetadataContextProvider>
                    <APMServiceContext.Provider
                      value={{
                        serviceName,
                        transactionType,
                        transactionTypeStatus: FETCH_STATUS.SUCCESS,
                        transactionTypes: [],
                        fallbackToTransactions: false,
                        serviceAgentStatus: FETCH_STATUS.SUCCESS,
                      }}
                    >
                      <ChartPointerEventContextProvider>
                        <StoryComponent />
                      </ChartPointerEventContextProvider>
                    </APMServiceContext.Provider>
                  </ApmTimeRangeMetadataContextProvider>
                </MockTimeRangeContextProvider>
              </MockUrlParamsContextProvider>
            </KibanaContextProvider>
          </MockApmPluginContextWrapper>
        </MemoryRouter>
      );
    },
  ],
};

export default stories;

export const Example: Story<Args> = () => {
  return <LatencyChart height={300} kuery="" />;
};
Example.args = {
  latencyChartResponse: latencyChartResponseJson,
};

export const NoData: Story<Args> = () => {
  return <LatencyChart height={300} kuery="" />;
};

NoData.args = {
  latencyChartResponse: {
    currentPeriod: { latencyTimeseries: [], overallAvgDuration: null },
    previousPeriod: { latencyTimeseries: [], overallAvgDuration: null },
  },
};
