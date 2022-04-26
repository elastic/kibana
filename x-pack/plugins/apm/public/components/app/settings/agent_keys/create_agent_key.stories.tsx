/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { Meta, Story } from '@storybook/react';
import React, { ComponentProps } from 'react';
import { CreateAgentKeyFlyout } from './create_agent_key';
import { CreateApiKeyResponse } from '../../../../../common/agent_key_types';

type Args = ComponentProps<typeof CreateAgentKeyFlyout>;

const stories: Meta<Args> = {
  title: 'app/Settings/AgentKeys/CreateAgentKeyFlyout',
  component: CreateAgentKeyFlyout,
};
export default stories;

export const Example: Story<Args> = (args) => {
  return <CreateAgentKeyFlyout {...args} />;
};

Example.args = {
  onCancel: () => {},
  onSuccess: (agentKey: CreateApiKeyResponse) => {},
  onError: (keyName: string, message: string) => {},
};
