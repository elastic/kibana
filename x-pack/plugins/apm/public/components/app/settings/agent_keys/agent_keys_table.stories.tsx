/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { Meta, Story } from '@storybook/react';
import React, { ComponentProps } from 'react';
import { CoreStart } from '@kbn/core/public';
import { createKibanaReactContext } from '@kbn/kibana-react-plugin/public';
import { ApiKey } from '@kbn/security-plugin/common/model';
import type { ApmPluginContextValue } from '../../../../context/apm_plugin/apm_plugin_context';
import { MockApmPluginContextWrapper } from '../../../../context/apm_plugin/mock_apm_plugin_context';
import { AgentKeysTable } from './agent_keys_table';

type Args = ComponentProps<typeof AgentKeysTable>;

const coreMock = {
  http: {
    get: async () => {
      return { fallBackToTransactions: false };
    },
  },
  notifications: { toasts: { add: () => {} } },
  uiSettings: { get: () => ({}) },
} as unknown as CoreStart;

const KibanaReactContext = createKibanaReactContext(coreMock);

const agentKeys: ApiKey[] = [
  {
    id: 'M96XSX4BQcLuJqE2VX29',
    name: 'apm_api_key1',
    creation: 1641912161726,
    invalidated: false,
    username: 'elastic',
    realm: 'reserved',
    expiration: 0,
    metadata: { application: 'apm' },
  },

  {
    id: 'Nd6XSX4BQcLuJqE2eH2A',
    name: 'apm_api_key2',
    creation: 1641912170624,
    invalidated: false,
    username: 'elastic',
    realm: 'reserved',
    expiration: 0,
    metadata: { application: 'apm' },
  },
];

const stories: Meta<Args> = {
  title: 'app/Settings/AgentKeys/AgentKeysTable',
  component: AgentKeysTable,
  decorators: [
    (StoryComponent) => {
      return (
        <KibanaReactContext.Provider>
          <MockApmPluginContextWrapper
            value={{ core: coreMock } as unknown as ApmPluginContextValue}
          >
            <StoryComponent />
          </MockApmPluginContextWrapper>
        </KibanaReactContext.Provider>
      );
    },
  ],
};
export default stories;

export const ExampleData: Story<Args> = (args) => {
  return <AgentKeysTable {...args} />;
};

ExampleData.args = {
  agentKeys,
};
