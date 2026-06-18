/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreStart } from '@kbn/core/public';
import type { StoryObj, Meta } from '@storybook/react';
import React from 'react';
import { LatencyChart } from '.';
import type { Props } from '.';
import { ApmDocumentType } from '../../../../../common/document_type';
import { RollupInterval } from '../../../../../common/rollup';
import type { ApmPluginContextValue } from '../../../../context/apm_plugin/apm_plugin_context';
import { MockApmPluginStorybook } from '../../../../context/apm_plugin/mock_apm_plugin_storybook';
import type { APMServiceContextValue } from '../../../../context/apm_service/apm_service_context';
import { ChartPointerEventContextProvider } from '../../../../context/chart_pointer_event/chart_pointer_event_context';
import { FETCH_STATUS } from '../../../../hooks/use_fetcher';
import type { APIReturnType } from '../../../../services/rest/create_call_apm_api';
import {
  opbeansScenario,
  toLatencyChartResponse,
  SCENARIO_START,
  SCENARIO_END,
} from '../../../../test_helpers/synthtrace_stories';

/** Minimal time_range_metadata so usePreferredDataSourceAndBucketSize returns non-null. */
const TIME_RANGE_METADATA_DEFAULTS = {
  isUsingServiceDestinationMetrics: true,
  sources: [
    {
      documentType: ApmDocumentType.ServiceTransactionMetric,
      hasDocs: true,
      rollupInterval: RollupInterval.OneMinute,
      hasDurationSummaryField: true,
    },
    {
      documentType: ApmDocumentType.TransactionMetric,
      hasDocs: true,
      rollupInterval: RollupInterval.OneMinute,
      hasDurationSummaryField: true,
    },
    {
      documentType: ApmDocumentType.TransactionEvent,
      hasDocs: true,
      rollupInterval: RollupInterval.None,
      hasDurationSummaryField: false,
    },
    {
      documentType: ApmDocumentType.ServiceDestinationMetric,
      hasDocs: true,
      rollupInterval: RollupInterval.None,
      hasDurationSummaryField: false,
    },
  ],
};

/** Service names available in the shared opbeans scenario. */
const OPBEANS_SERVICES = [
  'opbeans-node',
  'opbeans-go',
  'opbeans-java',
  'opbeans-python',
  'opbeans-dotnet',
] as const;

interface Args extends Props {
  serviceName?: (typeof OPBEANS_SERVICES)[number] | string;
  latencyChartResponse?: APIReturnType<'GET /internal/apm/services/{serviceName}/transactions/charts/latency'>;
}

const stories: Meta<Args> = {
  title: 'shared/charts/LatencyChart',
  component: LatencyChart,
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component:
          'Latency-over-time chart for a single APM service. Renders a time-series line from ' +
          'the `GET .../transactions/charts/latency` endpoint. Use the **serviceName** control ' +
          'to switch between opbeans services and see how latency profiles differ.',
      },
    },
    a11y: {
      config: {
        rules: [
          { id: 'color-contrast', enabled: true },
          { id: 'image-alt', enabled: true },
          { id: 'aria-required-attr', enabled: true },
          { id: 'aria-roles', enabled: true },
          { id: 'region', enabled: false }, // disabled for Storybook context
        ],
      },
    },
  },
  argTypes: {
    serviceName: {
      control: 'select',
      options: OPBEANS_SERVICES,
      description:
        'Pick an opbeans service from the shared synthtrace scenario. The chart re-renders ' +
        "with that service's latency data (derived from in-memory synthtrace docs).",
    },
    latencyChartResponse: {
      control: {
        type: 'object',
      },
      description:
        'Advanced override: supply the full latency chart API response directly. ' +
        'When `serviceName` is set this field is ignored.',
    },
  },
  decorators: [
    (StoryComponent, { args }) => {
      const { serviceName, latencyChartResponse } = args as Args;

      // serviceName control takes priority; fall back to the explicit response (e.g. NoData).
      const response = serviceName
        ? toLatencyChartResponse(opbeansScenario(), serviceName)
        : latencyChartResponse;

      const contextServiceName = serviceName ?? 'opbeans-node';

      const coreMock = {
        http: {
          get: async (pathname: string) => {
            if (pathname === '/internal/apm/time_range_metadata')
              return TIME_RANGE_METADATA_DEFAULTS;
            if (pathname.endsWith('/transactions/charts/latency')) return response;
            return {};
          },
        },
      } as unknown as CoreStart;

      const serviceContextValue = {
        serviceName: contextServiceName,
        agentName: 'nodejs',
        transactionType: 'request',
        transactionTypeStatus: FETCH_STATUS.SUCCESS,
        transactionTypes: ['request'],
        fallbackToTransactions: false,
        serviceAgentStatus: FETCH_STATUS.SUCCESS,
      } as unknown as APMServiceContextValue;

      return (
        <MockApmPluginStorybook
          routePath={`/services/${contextServiceName}/overview?environment=ENVIRONMENT_ALL&kuery=&rangeFrom=${SCENARIO_START.toISOString()}&rangeTo=${SCENARIO_END.toISOString()}&transactionType=request&comparisonEnabled=false&latencyAggregationType=avg`}
          apmContext={{ core: coreMock } as unknown as ApmPluginContextValue}
          serviceContextValue={serviceContextValue}
        >
          <ChartPointerEventContextProvider>
            <StoryComponent />
          </ChartPointerEventContextProvider>
        </MockApmPluginStorybook>
      );
    },
  ],
};

export default stories;

/**
 * **Synthtrace-generated story** — demonstrates the scenario-driven pattern.
 *
 * The `latencyChartResponse` fixture is derived from the shared `opbeansScenario()`
 * (the same dataset the service map uses), so latency values here are consistent
 * with the topology shown in `app/ServiceMap/ServiceMap → SynthtraceGenerated`.
 *
 * Use the **serviceName** control to switch between the five opbeans services.
 */
export const Example: StoryObj<Args> = {
  render: () => {
    return <LatencyChart height={300} kuery="" />;
  },

  args: {
    serviceName: 'opbeans-node',
  },
};

export const NoData: StoryObj<Args> = {
  render: () => {
    return <LatencyChart height={300} kuery="" />;
  },

  args: {
    latencyChartResponse: {
      currentPeriod: { latencyTimeseries: [], overallAvgDuration: null },
      previousPeriod: { latencyTimeseries: [], overallAvgDuration: null },
    },
  },
};
