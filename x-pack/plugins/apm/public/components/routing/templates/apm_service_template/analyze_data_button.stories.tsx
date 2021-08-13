/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Story, StoryContext } from '@storybook/react';
import React, { ComponentType } from 'react';
import { CoreStart } from '../../../../../../../../src/core/public';
import { createKibanaReactContext } from '../../../../../../../../src/plugins/kibana_react/public';
import { APMServiceContext } from '../../../../context/apm_service/apm_service_context';
import { MockUrlParamsContextProvider } from '../../../../context/url_params_context/mock_url_params_context_provider';
import { AnalyzeDataButton } from './analyze_data_button';
import { AgentMetadataDetails } from '../../../../context/apm_service/use_agent_metadata_details_fetcher';

interface Args {
  agentMetadataDetails: AgentMetadataDetails;
  canShowDashboard: boolean;
  environment?: string;
  serviceName: string;
}

export default {
  title: 'routing/templates/ApmServiceTemplate/AnalyzeDataButton',
  component: AnalyzeDataButton,
  decorators: [
    (StoryComponent: ComponentType, { args }: StoryContext) => {
      const {
        agentMetadataDetails,
        canShowDashboard,
        environment,
        serviceName,
      } = args;

      const KibanaContext = createKibanaReactContext(({
        application: {
          capabilities: { dashboard: { show: canShowDashboard } },
        },
        http: { basePath: { get: () => '' } },
      } as unknown) as Partial<CoreStart>);

      return (
        <MockUrlParamsContextProvider
          params={{ environment, rangeFrom: 'now-15m', rangeTo: 'now' }}
        >
          <APMServiceContext.Provider
            value={{
              agentMetadataDetails,
              alerts: [],
              transactionTypes: [],
              serviceName,
            }}
          >
            <KibanaContext.Provider>
              <StoryComponent />
            </KibanaContext.Provider>
          </APMServiceContext.Provider>
        </MockUrlParamsContextProvider>
      );
    },
  ],
};

export const Example: Story<Args> = () => {
  return <AnalyzeDataButton />;
};
Example.args = {
  canShowDashboard: true,
  environment: 'testEnvironment',
  serviceName: 'testServiceName',
  agentMetadataDetails: {
    service: {
      runtime: {
        name: 'foo',
        version: '1',
      },
      agent: {
        name: 'iOS/swift',
        version: '1.2',
      },
    },
  },
};
