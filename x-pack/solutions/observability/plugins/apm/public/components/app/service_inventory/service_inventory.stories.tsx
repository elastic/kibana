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
import { mockApmApiCallResponse } from '../../../services/rest/storybook_mock_http';

const anomalyDetectionJobsContextValue = {
  anomalyDetectionJobsData: { jobs: [], hasLegacyJobs: false },
  anomalyDetectionJobsStatus: FETCH_STATUS.SUCCESS,
  anomalyDetectionJobsRefetch: () => {},
  anomalyDetectionSetupState: AnomalyDetectionSetupState.NoJobs,
};

const stories: Meta<{}> = {
  title: 'app/ServiceInventory',
  component: ServiceInventory,
  parameters: {
    routePath: '/services?rangeFrom=now-15m&rangeTo=now&comparisonEnabled=true&offset=1d',
  },
  decorators: [
    (StoryComponent) => {
      mockApmApiCallResponse('GET /internal/apm/services', () => ({
        items: [
          {
            serviceName: 'opbeans-java',
            transactionType: 'request',
            agentName: 'java' as const,
            throughput: 312.5,
            latency: 48250,
            transactionErrorRate: 0.035,
            environments: ['production'],
          },
          {
            serviceName: 'opbeans-node',
            transactionType: 'request',
            agentName: 'nodejs' as const,
            throughput: 186.2,
            latency: 12800,
            transactionErrorRate: 0.012,
            environments: ['production'],
          },
          {
            serviceName: 'opbeans-python',
            transactionType: 'request',
            agentName: 'python' as const,
            throughput: 97.8,
            latency: 32100,
            transactionErrorRate: 0.058,
            environments: ['staging'],
          },
          {
            serviceName: 'opbeans-ruby',
            transactionType: 'request',
            agentName: 'ruby' as const,
            throughput: 44.1,
            latency: 65400,
            transactionErrorRate: 0.021,
            environments: ['production', 'staging'],
          },
          {
            serviceName: 'opbeans-go',
            transactionType: 'request',
            agentName: 'go' as const,
            throughput: 520.0,
            latency: 5200,
            transactionErrorRate: 0.002,
            environments: ['production'],
          },
        ],
        maxCountExceeded: false,
        serviceOverflowCount: 0,
      }));

      const now = Date.now();
      const serviceNames = [
        'opbeans-java',
        'opbeans-node',
        'opbeans-python',
        'opbeans-ruby',
        'opbeans-go',
      ];

      const makeSparkline = (baseValue: number) =>
        Array.from({ length: 15 }, (_, i) => ({
          x: now - (15 - i) * 60000,
          y: baseValue * (0.8 + Math.random() * 0.4),
        }));

      const currentPeriod: Record<string, any> = {};
      const previousPeriod: Record<string, any> = {};
      const baseLatencies = [48250, 12800, 32100, 65400, 5200];
      const baseThroughputs = [312.5, 186.2, 97.8, 44.1, 520.0];
      const baseErrorRates = [0.035, 0.012, 0.058, 0.021, 0.002];

      serviceNames.forEach((name, i) => {
        currentPeriod[name] = {
          serviceName: name,
          latency: makeSparkline(baseLatencies[i]),
          throughput: makeSparkline(baseThroughputs[i]),
          transactionErrorRate: makeSparkline(baseErrorRates[i]),
        };
        previousPeriod[name] = {
          serviceName: name,
          latency: makeSparkline(baseLatencies[i] * 1.1),
          throughput: makeSparkline(baseThroughputs[i] * 0.9),
          transactionErrorRate: makeSparkline(baseErrorRates[i] * 1.2),
        };
      });

      mockApmApiCallResponse('POST /internal/apm/services/detailed_statistics', () => ({
        currentPeriod,
        previousPeriod,
      }));

      mockApmApiCallResponse('GET /internal/apm/fallback_to_transactions', () => ({
        fallbackToTransactions: false,
      }));

      return (
        <AnomalyDetectionJobsContext.Provider value={anomalyDetectionJobsContextValue}>
          <StoryComponent />
        </AnomalyDetectionJobsContext.Provider>
      );
    },
  ],
};
export default stories;

export const Example: StoryFn<{}> = () => {
  return <ServiceInventory />;
};
