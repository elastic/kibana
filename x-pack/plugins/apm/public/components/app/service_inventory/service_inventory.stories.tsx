/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Meta, Story } from '@storybook/react';
import React from 'react';
import { CoreStart } from '../../../../../../../src/core/public';
import { TimeRangeComparisonEnum } from '../../../../common/runtime_types/comparison_type_rt';
import { AnomalyDetectionJobsContext } from '../../../context/anomaly_detection_jobs/anomaly_detection_jobs_context';
import { MockContextValue } from '../../../context/mock/mock_context';
import { MockUrlParamsContextProvider } from '../../../context/url_params_context/mock_url_params_context_provider';
import { FETCH_STATUS } from '../../../hooks/use_fetcher';
import { ServiceInventory } from './';

type Args = MockContextValue;

const coreMock = {
  http: {
    get: (endpoint: string) => {
      switch (endpoint) {
        case '/internal/apm/services':
          return { items: [] };
        default:
          return {};
      }
    },
  },
};

const stories: Meta<Args> = {
  title: 'app/ServiceInventory',
  component: ServiceInventory,
  args: {
    path: '/services?rangeFrom=now-15m&rangeTo=now',
    coreStart: coreMock as CoreStart,
  },
  decorators: [
    (StoryComponent) => {
      const anomlyDetectionJobsContextValue = {
        anomalyDetectionJobsData: { jobs: [], hasLegacyJobs: false },
        anomalyDetectionJobsStatus: FETCH_STATUS.SUCCESS,
        anomalyDetectionJobsRefetch: () => {},
      };

      return (
        <MockUrlParamsContextProvider
          params={{
            comparisonEnabled: true,
            comparisonType: TimeRangeComparisonEnum.DayBefore,
          }}
        >
          <AnomalyDetectionJobsContext.Provider
            value={anomlyDetectionJobsContextValue}
          >
            <StoryComponent />
          </AnomalyDetectionJobsContext.Provider>
        </MockUrlParamsContextProvider>
      );
    },
  ],
};
export default stories;

export const Example: Story<Args> = () => {
  return <ServiceInventory />;
};
