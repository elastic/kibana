/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Meta, Story } from '@storybook/core';
import React from 'react';
import { AgentConfiguration } from '../../../../../../common/agent_configuration/configuration_types';
import { MockApmAppContextProvider } from '../../../../../context/mock_apm_app/mock_apm_app_context';
import { FETCH_STATUS } from '../../../../../hooks/use_fetcher';
import { AgentConfigurationCreateEdit } from './index';

const stories: Meta<{}> = {
  title: 'app/Settings/AgentConfigurations/AgentConfigurationCreateEdit',
  component: AgentConfigurationCreateEdit,
  decorators: [
    (StoryComponent) => {
      return (
        <MockApmAppContextProvider>
          <StoryComponent />
        </MockApmAppContextProvider>
      );
    },
  ],
};
export default stories;

export const WithConfig: Story<{}> = () => {
  return (
    <AgentConfigurationCreateEdit
      pageStep="choose-settings-step"
      existingConfigResult={{
        status: FETCH_STATUS.SUCCESS,
        data: {
          service: { name: 'opbeans-node', environment: 'production' },
          settings: {},
        } as AgentConfiguration,
      }}
    />
  );
};
