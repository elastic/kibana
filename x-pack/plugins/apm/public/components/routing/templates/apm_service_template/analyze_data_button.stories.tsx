/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Story, StoryContext } from '@storybook/react';
import React, { ComponentType } from 'react';
import { MemoryRouter } from 'react-router-dom';
import { CoreStart } from '@kbn/core/public';
import { createKibanaReactContext } from '@kbn/kibana-react-plugin/public';
import { ENVIRONMENT_ALL } from '../../../../../common/environment_filter_values';
import { MockApmPluginContextWrapper } from '../../../../context/apm_plugin/mock_apm_plugin_context';
import { APMServiceContext } from '../../../../context/apm_service/apm_service_context';
import { AnalyzeDataButton } from './analyze_data_button';

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
    (StoryComponent: ComponentType, { args }: StoryContext) => {
      const { agentName, canShowDashboard, environment, serviceName } = args;

      const KibanaContext = createKibanaReactContext({
        application: {
          capabilities: { dashboard: { show: canShowDashboard } },
        },
        http: { basePath: { get: () => '' } },
      } as unknown as Partial<CoreStart>);

      return (
        <MemoryRouter
          initialEntries={[
            `/services/${serviceName}/overview?rangeFrom=now-15m&rangeTo=now&environment=${
              environment ?? ENVIRONMENT_ALL.value
            }&kuery=`,
          ]}
        >
          <MockApmPluginContextWrapper>
            <APMServiceContext.Provider
              value={{
                agentName,
                transactionTypes: [],
                serviceName,
                fallbackToTransactions: false,
              }}
            >
              <KibanaContext.Provider>
                <StoryComponent />
              </KibanaContext.Provider>
            </APMServiceContext.Provider>
          </MockApmPluginContextWrapper>
        </MemoryRouter>
      );
    },
  ],
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
