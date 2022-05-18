/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Meta, Story } from '@storybook/react';
import React from 'react';
import { MemoryRouter } from 'react-router-dom';
import { CoreStart } from '@kbn/core/public';
import { createKibanaReactContext } from '@kbn/kibana-react-plugin/public';
import { AnomalyDetectionSetupState } from '../../../../common/anomaly_detection/get_anomaly_detection_setup_state';
import { AnomalyDetectionJobsContext } from '../../../context/anomaly_detection_jobs/anomaly_detection_jobs_context';
import { ApmPluginContextValue } from '../../../context/apm_plugin/apm_plugin_context';
import { MockApmPluginContextWrapper } from '../../../context/apm_plugin/mock_apm_plugin_context';
import { MockUrlParamsContextProvider } from '../../../context/url_params_context/mock_url_params_context_provider';
import { FETCH_STATUS } from '../../../hooks/use_fetcher';
import { ServiceInventory } from '.';

const stories: Meta<{}> = {
  title: 'app/ServiceInventory',
  component: ServiceInventory,
  decorators: [
    (StoryComponent) => {
      const coreMock = {
        http: {
          get: (endpoint: string) => {
            switch (endpoint) {
              case '/internal/apm/services':
                return { items: [] };

              case '/internal/apm/sorted_and_filtered_services':
                return { services: [] };

              default:
                return {};
            }
            return {};
          },
        },
        notifications: { toasts: { add: () => {}, addWarning: () => {} } },
        uiSettings: { get: () => [] },
      } as unknown as CoreStart;

      const KibanaReactContext = createKibanaReactContext(coreMock);

      const anomlyDetectionJobsContextValue = {
        anomalyDetectionJobsData: { jobs: [], hasLegacyJobs: false },
        anomalyDetectionJobsStatus: FETCH_STATUS.SUCCESS,
        anomalyDetectionJobsRefetch: () => {},
        anomalyDetectionSetupState: AnomalyDetectionSetupState.NoJobs,
      };

      return (
        <MemoryRouter
          initialEntries={['/services?rangeFrom=now-15m&rangeTo=now']}
        >
          <KibanaReactContext.Provider>
            <MockUrlParamsContextProvider
              params={{
                comparisonEnabled: true,
                offset: '1d',
              }}
            >
              <MockApmPluginContextWrapper
                value={{ core: coreMock } as ApmPluginContextValue}
              >
                <AnomalyDetectionJobsContext.Provider
                  value={anomlyDetectionJobsContextValue}
                >
                  <StoryComponent />
                </AnomalyDetectionJobsContext.Provider>
              </MockApmPluginContextWrapper>
            </MockUrlParamsContextProvider>
          </KibanaReactContext.Provider>
        </MemoryRouter>
      );
    },
  ],
};
export default stories;

export const Example: Story<{}> = () => {
  return <ServiceInventory />;
};
