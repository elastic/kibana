/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiPageTemplate } from '@elastic/eui';
import { Story, StoryContext } from '@storybook/react';
import React, { ComponentProps, ComponentType } from 'react';
import { MemoryRouter } from 'react-router-dom';
import { CoreStart } from '../../../../../../../../src/core/public';
import { createKibanaReactContext } from '../../../../../../../../src/plugins/kibana_react/public';
import { ContainerType } from '../../../../../common/service_metadata';
import { MockApmPluginContextWrapper } from '../../../../context/apm_plugin/mock_apm_plugin_context';
import { MockUrlParamsContextProvider } from '../../../../context/url_params_context/mock_url_params_context_provider';
import { createCallApmApi } from '../../../../services/rest/createCallApmApi';
import { ApmServiceTemplate } from './';

interface Args {
  agentName: string;
  cloudProvider: string;
  containerType: ContainerType;
  environment: string;
  selectedTab: ComponentProps<typeof ApmServiceTemplate>['selectedTab'];
  title: string;
}

const KibanaContext = createKibanaReactContext(({
  observability: {
    navigation: {
      PageTemplate: EuiPageTemplate,
    },
  },
  usageCollection: { reportUiCounter: () => {} },
} as unknown) as Partial<CoreStart>);

export default {
  title: 'routing/Templates/ApmServiceTemplate',
  component: ApmServiceTemplate,
  decorators: [
    (StoryComponent: ComponentType, { args }: StoryContext) => {
      const { agentName, cloudProvider, containerType, serviceName } = args;
      const coreMock = ({
        http: {
          get: (endpoint: string) => {
            switch (endpoint) {
              case '/api/apm/environments':
                return { environments: [] };
              case `/api/apm/services/${serviceName}/agent_name`:
                return { agentName };
              case `/api/apm/services/${serviceName}/metadata/icons`:
                return { agentName, cloudProvider, containerType };
              default:
                return undefined;
            }
          },
        },
        uiSettings: { get: () => true },
      } as unknown) as CoreStart;

      createCallApmApi(coreMock);

      return (
        <MemoryRouter initialEntries={[`/services/${serviceName}`]}>
          <MockUrlParamsContextProvider
            params={{ rangeFrom: 'now-15m', rangeTo: 'now' }}
          >
            <MockApmPluginContextWrapper>
              <KibanaContext.Provider>
                <StoryComponent />
              </KibanaContext.Provider>
            </MockApmPluginContextWrapper>
          </MockUrlParamsContextProvider>
        </MemoryRouter>
      );
    },
  ],
};

export const Example: Story<Args> = ({ selectedTab, title }) => {
  return (
    <ApmServiceTemplate selectedTab={selectedTab} title={title}>
      &nbsp;
    </ApmServiceTemplate>
  );
};
Example.args = {
  agentName: 'iOS/swift',
  cloudProvider: 'azure',
  containerType: 'Docker',
  environment: 'testEnvironment',
  selectedTab: 'transactions',
  title: 'testServiceName',
};
