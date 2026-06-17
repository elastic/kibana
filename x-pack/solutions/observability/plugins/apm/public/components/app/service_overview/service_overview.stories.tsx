/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { StoryFn, Meta } from '@storybook/react';
import React from 'react';
import { ServiceOverview } from '.';
import type { APMServiceContextValue } from '../../../context/apm_service/apm_service_context';
import { FETCH_STATUS } from '../../../hooks/use_fetcher';
import { mockApmApiCallResponse } from '../../../services/rest/call_apm_api_spy';
import { MockApmPluginStorybook } from '../../../context/apm_plugin/mock_apm_plugin_storybook';
import {
  opbeansScenario,
  toLatencyChartResponse,
  toThroughputChartResponse,
  toErrorRateChartResponse,
} from '../../../test_helpers/synthtrace_stories';

const SERVICE_NAME = 'opbeans-node';

const stories: Meta<{}> = {
  title: 'app/ServiceOverview',
  component: ServiceOverview,
  parameters: {
    routePath:
      '/services/testServiceName/overview?environment=ENVIRONMENT_ALL&rangeFrom=now-15m&rangeTo=now',
    serviceContextValue: {
      serviceName: 'testServiceName',
      transactionType: 'type',
      transactionTypeStatus: FETCH_STATUS.SUCCESS,
      transactionTypes: ['type'],
    } as unknown as APMServiceContextValue,
  },
  decorators: [
    (StoryComponent) => {
      const docs = opbeansScenario();

      // ── charts — synthtrace-derived ───────────────────────────────────────
      mockApmApiCallResponse(
        'GET /internal/apm/services/{serviceName}/transactions/charts/latency',
        () => toLatencyChartResponse(docs, SERVICE_NAME)
      );
      mockApmApiCallResponse('GET /internal/apm/services/{serviceName}/throughput', () =>
        toThroughputChartResponse(docs, SERVICE_NAME)
      );
      mockApmApiCallResponse(
        'GET /internal/apm/services/{serviceName}/transactions/charts/error_rate',
        () => toErrorRateChartResponse(docs, SERVICE_NAME)
      );

      // ── tables — minimal empty responses ─────────────────────────────────
      mockApmApiCallResponse(
        `GET /api/apm/services/{serviceName}/annotation/search 2023-10-31`,
        () => ({ annotations: [] })
      );
      mockApmApiCallResponse(`GET /internal/apm/data_view/index_pattern`, () => ({
        apmDataViewIndexPattern: 'traces-apm*,apm-*',
        apmIndices: {
          transaction: 'traces-apm*,apm-*',
          span: 'traces-apm*,apm-*',
          error: 'logs-apm*,apm-*',
          metric: 'metrics-apm*,apm-*',
          onboarding: 'apm-*',
          sourcemap: 'apm-*',
        },
      }));
      mockApmApiCallResponse(`GET /internal/apm/fallback_to_transactions`, () => ({
        fallbackToTransactions: false,
      }));
      mockApmApiCallResponse(
        `GET /internal/apm/services/{serviceName}/transactions/groups/main_statistics`,
        () => ({
          transactionGroups: [],
          maxCountExceeded: false,
          transactionOverflowCount: 0,
          hasActiveAlerts: false,
        })
      );
      mockApmApiCallResponse(
        `GET /internal/apm/services/{serviceName}/transactions/groups/detailed_statistics`,
        () => ({ currentPeriod: {}, previousPeriod: {} })
      );
      mockApmApiCallResponse(
        `GET /internal/apm/services/{serviceName}/errors/groups/main_statistics`,
        () => ({ errorGroups: [], maxCountExceeded: false })
      );
      mockApmApiCallResponse(
        `POST /internal/apm/services/{serviceName}/errors/groups/detailed_statistics`,
        () => ({ currentPeriod: {}, previousPeriod: {} })
      );
      mockApmApiCallResponse(`GET /internal/apm/services/{serviceName}/dependencies`, () => ({
        serviceDependencies: [],
      }));
      mockApmApiCallResponse(
        `GET /internal/apm/services/{serviceName}/service_overview_instances/main_statistics`,
        () => ({ currentPeriod: [], previousPeriod: [] })
      );
      mockApmApiCallResponse(
        `GET /internal/apm/services/{serviceName}/service_overview_instances/detailed_statistics`,
        () => ({ currentPeriod: {}, previousPeriod: {} })
      );
      mockApmApiCallResponse(
        `GET /internal/apm/services/{serviceName}/transaction/charts/breakdown`,
        () => ({ timeseries: [] })
      );

      const serviceContextValue = {
        serviceName: SERVICE_NAME,
        agentName: 'nodejs',
        transactionType: 'request',
        transactionTypeStatus: FETCH_STATUS.SUCCESS,
        transactionTypes: ['request'],
        fallbackToTransactions: false,
        serviceAgentStatus: FETCH_STATUS.SUCCESS,
      } as unknown as APMServiceContextValue;

      return (
        <MockApmPluginStorybook
          routePath={`/services/${SERVICE_NAME}/overview?environment=ENVIRONMENT_ALL&rangeFrom=now-15m&rangeTo=now`}
          serviceContextValue={serviceContextValue}
        >
          <StoryComponent />
        </MockApmPluginStorybook>
      );
    },
  ],
};
export default stories;

/**
 * **Synthtrace-generated story** — demonstrates the scenario-driven pattern.
 *
 * Latency, throughput, and error-rate charts all derive from the shared
 * `opbeansScenario()` (same dataset as `app/ServiceMap/ServiceMap → SynthtraceGenerated`),
 * so the service name and latency values are consistent across the Storybook.
 *
 * Tables (transactions, errors, dependencies, instances) render empty to keep
 * the story focused on the charts. Add selectors for those as needed.
 */
export const Example: StoryFn<{}> = () => {
  return <ServiceOverview />;
};
