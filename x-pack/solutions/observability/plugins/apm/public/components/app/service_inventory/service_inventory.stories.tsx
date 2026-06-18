/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { StoryFn, Meta } from '@storybook/react';
import React from 'react';
import { ServiceInventory } from '.';
import { AnomalyDetectionSetupState } from '../../../../common/anomaly_detection/get_anomaly_detection_setup_state';
import { ApmDocumentType } from '../../../../common/document_type';
import { RollupInterval } from '../../../../common/rollup';
import { AnomalyDetectionJobsContext } from '../../../context/anomaly_detection_jobs/anomaly_detection_jobs_context';
import { FETCH_STATUS } from '../../../hooks/use_fetcher';
import type { CoreStart } from '@kbn/core/public';
import { MockApmPluginStorybook } from '../../../context/apm_plugin/mock_apm_plugin_storybook';
import type { ApmPluginContextValue } from '../../../context/apm_plugin/apm_plugin_context';
import {
  opbeansScenario,
  SCENARIO_START,
  SCENARIO_END,
  toServiceInventoryResponse,
  toDetailedStatisticsResponse,
} from '../../../test_helpers/synthtrace_stories';

const anomalyDetectionJobsContextValue = {
  anomalyDetectionJobsData: { jobs: [], hasLegacyJobs: false },
  anomalyDetectionJobsStatus: FETCH_STATUS.SUCCESS,
  anomalyDetectionJobsRefetch: () => {},
  anomalyDetectionSetupState: AnomalyDetectionSetupState.NoJobs,
};

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

const stories: Meta<{}> = {
  title: 'app/ServiceInventory',
  component: ServiceInventory,
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component:
          'Service inventory table listing all APM-instrumented services with latency, ' +
          'throughput, and error-rate metrics. The `SynthtraceGenerated` story derives its ' +
          'data from the shared `opbeansScenario()` — no Elasticsearch required.',
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
};
export default stories;

// ── Empty-state story (original) ──────────────────────────────────────────────

export const Example: StoryFn<{}> = () => {
  return <ServiceInventory />;
};

Example.decorators = [
  (StoryComponent) => {
    const coreMock = {
      http: {
        get: async (endpoint: string) => {
          switch (endpoint) {
            case '/internal/apm/services':
              return { items: [] };

            case '/internal/apm/sorted_and_filtered_services':
              return { services: [] };

            default:
              return {};
          }
        },
      },
    } as unknown as CoreStart;

    return (
      <MockApmPluginStorybook
        routePath="/services?rangeFrom=now-15m&rangeTo=now&comparisonEnabled=true&offset=1d"
        apmContext={{ core: coreMock } as unknown as ApmPluginContextValue}
      >
        <AnomalyDetectionJobsContext.Provider value={anomalyDetectionJobsContextValue}>
          <StoryComponent />
        </AnomalyDetectionJobsContext.Provider>
      </MockApmPluginStorybook>
    );
  },
];

// ── Synthtrace-generated story ─────────────────────────────────────────────────

/**
 * **Synthtrace-generated story** — demonstrates the scenario-driven pattern.
 *
 * All five opbeans services (node, go, java, python, dotnet) are derived from
 * the shared `opbeansScenario()`. Each row shows realistic latency, throughput,
 * and error-rate values computed from the same in-memory trace documents used by
 * the service-map and chart stories, so the numbers stay consistent across
 * the whole Storybook.
 */
export const SynthtraceGenerated: StoryFn<{}> = () => {
  return <ServiceInventory />;
};

SynthtraceGenerated.decorators = [
  (StoryComponent) => {
    const docs = opbeansScenario();
    const inventoryResponse = toServiceInventoryResponse(docs);

    const coreMock = {
      http: {
        get: async (endpoint: string) => {
          switch (endpoint) {
            case '/internal/apm/time_range_metadata':
              return TIME_RANGE_METADATA_DEFAULTS;
            case '/internal/apm/services':
              return inventoryResponse;
            default:
              return {};
          }
        },
        post: async (endpoint: string) => {
          if (endpoint === '/internal/apm/services/detailed_statistics') {
            return toDetailedStatisticsResponse(docs);
          }
          return { currentPeriod: {}, previousPeriod: {} };
        },
      },
    } as unknown as CoreStart;

    return (
      <MockApmPluginStorybook
        routePath={`/services?rangeFrom=${SCENARIO_START.toISOString()}&rangeTo=${SCENARIO_END.toISOString()}`}
        apmContext={{ core: coreMock } as unknown as ApmPluginContextValue}
      >
        <AnomalyDetectionJobsContext.Provider value={anomalyDetectionJobsContextValue}>
          <StoryComponent />
        </AnomalyDetectionJobsContext.Provider>
      </MockApmPluginStorybook>
    );
  },
];
