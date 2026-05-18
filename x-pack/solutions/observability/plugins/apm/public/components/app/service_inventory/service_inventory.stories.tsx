/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreStart } from '@kbn/core/public';
import type { StoryFn, Meta } from '@storybook/react';
import React from 'react';
import { ServiceInventory } from '.';
import { AnomalyDetectionSetupState } from '../../../../common/anomaly_detection/get_anomaly_detection_setup_state';
import { AnomalyDetectionJobsContext } from '../../../context/anomaly_detection_jobs/anomaly_detection_jobs_context';
import { FETCH_STATUS } from '../../../hooks/use_fetcher';

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
    apmContext: { core: coreMock },
  },
  decorators: [
    (StoryComponent) => (
      <AnomalyDetectionJobsContext.Provider value={anomalyDetectionJobsContextValue}>
        <StoryComponent />
      </AnomalyDetectionJobsContext.Provider>
    ),
  ],
};
export default stories;

export const Example: StoryFn<{}> = () => {
  return <ServiceInventory />;
};
