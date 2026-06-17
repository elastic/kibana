/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreStart } from '@kbn/core/public';
import type { StoryFn, Meta } from '@storybook/react';
import React from 'react';
import { ServiceOverview } from '.';
import { ApmDocumentType } from '../../../../common/document_type';
import { RollupInterval } from '../../../../common/rollup';
import { MockApmPluginStorybook } from '../../../context/apm_plugin/mock_apm_plugin_storybook';
import type { ApmPluginContextValue } from '../../../context/apm_plugin/apm_plugin_context';
import type { APMServiceContextValue } from '../../../context/apm_service/apm_service_context';
import { FETCH_STATUS } from '../../../hooks/use_fetcher';
import {
  opbeansScenario,
  SCENARIO_START,
  SCENARIO_END,
  toLatencyChartResponse,
  toThroughputChartResponse,
  toErrorRateChartResponse,
} from '../../../test_helpers/synthtrace_stories';

const SERVICE_NAME = 'opbeans-node';

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

const DATA_VIEW_DEFAULTS = {
  apmDataViewIndexPattern: 'traces-apm*,apm-*',
  apmIndices: {
    transaction: 'traces-apm*,apm-*',
    span: 'traces-apm*,apm-*',
    error: 'logs-apm*,apm-*',
    metric: 'metrics-apm*,apm-*',
    onboarding: 'apm-*',
    sourcemap: 'apm-*',
  },
};

const EMPTY_STATS = { currentPeriod: {}, previousPeriod: {} };

const stories: Meta<{}> = {
  title: 'app/ServiceOverview',
  component: ServiceOverview,
};
export default stories;

/**
 * **Synthtrace-generated story** — latency, throughput, and error-rate charts
 * are derived from the shared `opbeansScenario()`, the same dataset used by the
 * service-map and service-inventory stories for cross-story consistency.
 *
 * Tables (transactions, errors, dependencies, instances) render empty to keep
 * the story focused on the charts.
 */
export const Example: StoryFn<{}> = () => {
  return <ServiceOverview />;
};

Example.decorators = [
  (StoryComponent) => {
    const docs = opbeansScenario();

    const coreMock = {
      http: {
        get: async (endpoint: string) => {
          if (endpoint === '/internal/apm/time_range_metadata') return TIME_RANGE_METADATA_DEFAULTS;
          if (endpoint === '/internal/apm/data_view/index_pattern') return DATA_VIEW_DEFAULTS;
          if (endpoint === '/internal/apm/fallback_to_transactions')
            return { fallbackToTransactions: false };
          if (endpoint.endsWith('/transactions/charts/latency'))
            return toLatencyChartResponse(docs, SERVICE_NAME);
          if (endpoint.endsWith('/throughput'))
            return toThroughputChartResponse(docs, SERVICE_NAME);
          if (endpoint.endsWith('/transactions/charts/error_rate'))
            return toErrorRateChartResponse(docs, SERVICE_NAME);
          if (endpoint.endsWith('/transaction/charts/breakdown')) return { timeseries: [] };
          if (endpoint.includes('/annotation/search')) return { annotations: [] };
          if (endpoint.endsWith('/transactions/groups/main_statistics'))
            return {
              transactionGroups: [],
              maxCountExceeded: false,
              transactionOverflowCount: 0,
              hasActiveAlerts: false,
            };
          if (endpoint.endsWith('/transactions/groups/detailed_statistics')) return EMPTY_STATS;
          if (endpoint.endsWith('/errors/groups/main_statistics'))
            return { errorGroups: [], maxCountExceeded: false };
          if (endpoint.endsWith('/service_overview_instances/main_statistics'))
            return { currentPeriod: [], previousPeriod: [] };
          if (endpoint.endsWith('/service_overview_instances/detailed_statistics'))
            return EMPTY_STATS;
          if (endpoint.endsWith('/dependencies')) return { serviceDependencies: [] };
          return {};
        },
        post: async () => EMPTY_STATS,
      },
    } as unknown as CoreStart;

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
        routePath={`/services/${SERVICE_NAME}/overview?environment=ENVIRONMENT_ALL&rangeFrom=${SCENARIO_START.toISOString()}&rangeTo=${SCENARIO_END.toISOString()}`}
        serviceContextValue={serviceContextValue}
        apmContext={{ core: coreMock } as unknown as ApmPluginContextValue}
      >
        <StoryComponent />
      </MockApmPluginStorybook>
    );
  },
];
