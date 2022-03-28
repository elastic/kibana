/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Story } from '@storybook/react';
import React, { ComponentProps, ComponentType } from 'react';
import { MockApmPluginContextWrapper } from '../../context/apm_plugin/mock_apm_plugin_context';
import { BackendLink } from './backend_link';

type Args = ComponentProps<typeof BackendLink>;

export default {
  title: 'shared/BackendLink',
  component: BackendLink,
  decorators: [
    (StoryComponent: ComponentType) => {
      return (
        <MockApmPluginContextWrapper>
          <StoryComponent />
        </MockApmPluginContextWrapper>
      );
    },
  ],
};

export const Example: Story<Args> = (args) => {
  return <BackendLink {...args} />;
};
Example.args = {
  query: {
    backendName: 'postgres',
    environment: 'ENVIRONMENT_ALL',
    kuery: '',
    rangeFrom: 'now-15m',
    rangeTo: 'now',
    comparisonEnabled: false,
  },
};
