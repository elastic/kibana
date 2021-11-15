/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Meta, Story } from '@storybook/react';
import React from 'react';
import { ENVIRONMENT_ALL } from '../../../../../common/environment_filter_values';
import { APMServiceContext } from '../../../../context/apm_service/apm_service_context';
import {
  MockContextProvider,
  MockContextValue,
} from '../../../../context/mock/mock_context';
import { AnalyzeDataButton } from './analyze_data_button';

interface Args extends MockContextValue {
  agentName: string;
  environment?: string;
  serviceName: string;
}

const stories: Meta<Args> = {
  title: 'routing/templates/ApmServiceTemplate/AnalyzeDataButton',
  component: AnalyzeDataButton,
  decorators: [
    (StoryComponent, { args }) => {
      const { agentName, environment, serviceName } = args;

      return (
        <MockContextProvider
          value={{
            path: `/services/${serviceName}/overview?rangeFrom=now-15m&rangeTo=now&environment=${
              environment ?? ENVIRONMENT_ALL.value
            }&kuery=`,
          }}
        >
          <APMServiceContext.Provider
            value={{
              agentName,
              alerts: [],
              transactionTypes: [],
              serviceName,
            }}
          >
            <StoryComponent />
          </APMServiceContext.Provider>
        </MockContextProvider>
      );
    },
  ],
};
export default stories;

export const Example: Story<Args> = () => {
  return <AnalyzeDataButton />;
};
Example.args = {
  agentName: 'iOS/swift',
  environment: 'testEnvironment',
  serviceName: 'testServiceName',
};
