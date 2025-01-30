/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Story, DecoratorFn } from '@storybook/react';
import React from 'react';
import { MemoryRouter } from 'react-router-dom';
import { ENVIRONMENT_ALL } from '../../../../../common/environment_filter_values';
import { MockApmPluginContextWrapper } from '../../../../context/apm_plugin/mock_apm_plugin_context';
import { APMServiceContext } from '../../../../context/apm_service/apm_service_context';
import { AnalyzeDataButton } from './analyze_data_button';
import { FETCH_STATUS } from '../../../../hooks/use_fetcher';
import type { ApmPluginContextValue } from '../../../../context/apm_plugin/apm_plugin_context';

interface Args {
  agentName: string;
  canShowDashboard: boolean;
  environment?: string;
  serviceName: string;
}

export default {
  title: 'routing/templates/ApmServiceTemplate/AnalyzeDataButton',
  component: AnalyzeDataButton,
  decorators: [
    (StoryComponent, { args }) => {
      const { agentName, canShowDashboard, environment, serviceName } = args;

      return (
        <MemoryRouter
          initialEntries={[
            `/services/${serviceName}/overview?rangeFrom=now-15m&rangeTo=now&environment=${
              environment ?? ENVIRONMENT_ALL.value
            }&kuery=`,
          ]}
        >
          <MockApmPluginContextWrapper
            value={
              {
                core: {
                  application: {
                    capabilities: { dashboard_v2: { show: canShowDashboard } },
                  },
                  http: { basePath: { get: () => '' } },
                },
              } as unknown as ApmPluginContextValue
            }
          >
            <APMServiceContext.Provider
              value={{
                agentName,
                transactionTypeStatus: FETCH_STATUS.SUCCESS,
                transactionTypes: [],
                serviceName,
                fallbackToTransactions: false,
                serviceAgentStatus: FETCH_STATUS.SUCCESS,
                serviceEntitySummaryStatus: FETCH_STATUS.SUCCESS,
              }}
            >
              <StoryComponent />
            </APMServiceContext.Provider>
          </MockApmPluginContextWrapper>
        </MemoryRouter>
      );
    },
  ] as DecoratorFn[],
};

export const Example: Story<Args> = () => {
  return <AnalyzeDataButton />;
};
Example.args = {
  agentName: 'iOS/swift',
  canShowDashboard: true,
  environment: 'testEnvironment',
  serviceName: 'testServiceName',
};
