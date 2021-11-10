/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Meta, Story } from '@storybook/react';
import React, { ComponentProps } from 'react';
import { MockApmAppContextProvider } from '../../../context/mock_apm_app/mock_apm_app_context';
import { SettingsTemplate } from './settings_template';

type Args = ComponentProps<typeof SettingsTemplate>;

const pluginsStartMock = {
  observability: {
    navigation: {
      PageTemplate: () => {
        return <>hello world</>;
      },
    },
  },
};

const stories: Meta<Args> = {
  title: 'routing/templates/SettingsTemplate',
  component: SettingsTemplate,
  decorators: [
    (StoryComponent) => {
      return (
        <MockApmAppContextProvider value={{ pluginsStart: pluginsStartMock }}>
          <StoryComponent />
        </MockApmAppContextProvider>
      );
    },
  ],
};
export default stories;

export const Example: Story<Args> = (args) => {
  return <SettingsTemplate {...args} />;
};
Example.args = {
  children: <>test</>,
  selectedTab: 'agent-configurations',
};
