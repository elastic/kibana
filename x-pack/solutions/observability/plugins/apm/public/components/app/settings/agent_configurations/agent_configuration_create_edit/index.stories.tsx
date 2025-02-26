/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import type { CoreStart } from '@kbn/core/public';
import type { AgentConfiguration } from '../../../../../../common/agent_configuration/configuration_types';
import { FETCH_STATUS } from '../../../../../hooks/use_fetcher';
import { createCallApmApi } from '../../../../../services/rest/create_call_apm_api';
import { AgentConfigurationCreateEdit } from '.';
import type { ApmPluginContextValue } from '../../../../../context/apm_plugin/apm_plugin_context';
import { ApmPluginContext } from '../../../../../context/apm_plugin/apm_plugin_context';

const coreMock = {} as unknown as CoreStart;

// mock
createCallApmApi(coreMock);

const contextMock = {
  core: {
    notifications: {
      toasts: { addWarning: () => {}, addDanger: () => {} },
    },
  },
};

const meta: Meta<typeof AgentConfigurationCreateEdit> = {
  title: 'app/settings/AgentConfigurations/agent_configuration_create_edit',
  component: AgentConfigurationCreateEdit,
  decorators: [
    (Story) => (
      <ApmPluginContext.Provider value={contextMock as unknown as ApmPluginContextValue}>
        <Story />
      </ApmPluginContext.Provider>
    ),
  ],
  parameters: {
    docs: {
      source: {
        type: 'code',
      },
    },
    controls: {
      exclude: ['AgentConfigurationCreateEdit', 'ApmPluginContext.Provider'],
    },
  },
};

export default meta;

type Story = StoryObj<typeof AgentConfigurationCreateEdit>;

export const WithConfig: Story = {
  name: 'with config',
  args: {
    pageStep: 'choose-settings-step',
    existingConfigResult: {
      status: FETCH_STATUS.SUCCESS,
      data: {
        service: { name: 'opbeans-node', environment: 'production' },
        settings: {},
      } as AgentConfiguration,
    },
  },
};
