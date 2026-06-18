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
import { AnomalyDetectionJobsContext } from '../../../context/anomaly_detection_jobs/anomaly_detection_jobs_context';
import { FETCH_STATUS } from '../../../hooks/use_fetcher';
import {
  opbeansScenario,
  SCENARIO_START,
  SCENARIO_END,
  toServiceInventoryResponse,
  toDetailedStatisticsResponse,
  TIME_RANGE_METADATA_DEFAULTS,
  APM_STORY_A11Y,
  makeApmContextParams,
} from '../../../test_helpers/synthtrace_stories';

const anomalyDetectionJobsContextValue = {
  anomalyDetectionJobsData: { jobs: [], hasLegacyJobs: false },
  anomalyDetectionJobsStatus: FETCH_STATUS.SUCCESS,
  anomalyDetectionJobsRefetch: () => {},
  anomalyDetectionSetupState: AnomalyDetectionSetupState.NoJobs,
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
    a11y: APM_STORY_A11Y,
  },
};
export default stories;

export const Example: StoryFn<{}> = () => {
  return <ServiceInventory />;
};

Example.parameters = {
  routePath: '/services?rangeFrom=now-15m&rangeTo=now&comparisonEnabled=true&offset=1d',
  ...makeApmContextParams((endpoint) => {
    if (endpoint === '/internal/apm/time_range_metadata') return TIME_RANGE_METADATA_DEFAULTS;
    if (endpoint === '/internal/apm/services') return { items: [] };
    if (endpoint === '/internal/apm/sorted_and_filtered_services') return { services: [] };
    return {};
  }),
};

Example.decorators = [
  (StoryComponent) => (
    <AnomalyDetectionJobsContext.Provider value={anomalyDetectionJobsContextValue}>
      <StoryComponent />
    </AnomalyDetectionJobsContext.Provider>
  ),
];

/**
 * Showcases alerts, SLO status, and ML anomaly columns with hand-crafted data.
 * No Elasticsearch or ML cluster required.
 */
export const AllFeatures: StoryFn<{}> = () => {
  return <ServiceInventory />;
};

AllFeatures.storyName = 'All Features (Alerts + SLOs + ML Anomalies)';

AllFeatures.parameters = {
  routePath: `/services?rangeFrom=${SCENARIO_START.toISOString()}&rangeTo=${SCENARIO_END.toISOString()}`,
  ...makeApmContextParams(
    (endpoint) => {
      if (endpoint === '/internal/apm/time_range_metadata') return TIME_RANGE_METADATA_DEFAULTS;
      if (endpoint === '/internal/apm/services')
        return {
          items: [
            {
              serviceName: 'opbeans-node',
              transactionType: 'request',
              environments: ['opbeans'],
              agentName: 'nodejs',
              latency: 335_000,
              transactionErrorRate: 0,
              throughput: 2,
              alertsCount: 3,
              sloStatus: 'violated',
              sloCount: 1,
              anomalyScore: 82,
            },
            {
              serviceName: 'opbeans-java',
              transactionType: 'request',
              environments: ['opbeans'],
              agentName: 'java',
              latency: 380_000,
              transactionErrorRate: 0.1,
              throughput: 1,
              alertsCount: 1,
              sloStatus: 'degrading',
              sloCount: 2,
              anomalyScore: 55,
            },
            {
              serviceName: 'opbeans-go',
              transactionType: 'request',
              environments: ['opbeans'],
              agentName: 'go',
              latency: 150_000,
              transactionErrorRate: 0,
              throughput: 1,
              sloStatus: 'healthy',
              sloCount: 3,
              anomalyScore: 27,
            },
            {
              serviceName: 'opbeans-python',
              transactionType: 'request',
              environments: ['opbeans'],
              agentName: 'python',
              latency: 50_000,
              transactionErrorRate: 0,
              throughput: 1,
              sloStatus: 'noData',
              sloCount: 1,
              anomalyScore: 5,
            },
            {
              serviceName: 'opbeans-dotnet',
              transactionType: 'request',
              environments: ['opbeans'],
              agentName: 'dotnet',
              latency: 60_000,
              transactionErrorRate: 0,
              throughput: 1,
            },
          ],
          maxCountExceeded: false,
          serviceOverflowCount: 0,
        };
      return {};
    },
    (endpoint) => {
      if (endpoint === '/internal/apm/services/detailed_statistics')
        return toDetailedStatisticsResponse(opbeansScenario());
      return { currentPeriod: {}, previousPeriod: {} };
    }
  ),
};

AllFeatures.decorators = [
  (StoryComponent) => (
    <AnomalyDetectionJobsContext.Provider value={anomalyDetectionJobsContextValue}>
      <StoryComponent />
    </AnomalyDetectionJobsContext.Provider>
  ),
];

/** All five opbeans services derived from `opbeansScenario()` — consistent with chart and service-map stories. */
export const SynthtraceGenerated: StoryFn<{}> = () => {
  return <ServiceInventory />;
};

const _synthDocs = opbeansScenario();
const _inventoryResponse = toServiceInventoryResponse(_synthDocs);

SynthtraceGenerated.parameters = {
  routePath: `/services?rangeFrom=${SCENARIO_START.toISOString()}&rangeTo=${SCENARIO_END.toISOString()}`,
  ...makeApmContextParams(
    (endpoint) => {
      if (endpoint === '/internal/apm/time_range_metadata') return TIME_RANGE_METADATA_DEFAULTS;
      if (endpoint === '/internal/apm/services') return _inventoryResponse;
      return {};
    },
    (endpoint) => {
      if (endpoint === '/internal/apm/services/detailed_statistics')
        return toDetailedStatisticsResponse(_synthDocs);
      return { currentPeriod: {}, previousPeriod: {} };
    }
  ),
};

SynthtraceGenerated.decorators = [
  (StoryComponent) => (
    <AnomalyDetectionJobsContext.Provider value={anomalyDetectionJobsContextValue}>
      <StoryComponent />
    </AnomalyDetectionJobsContext.Provider>
  ),
];
