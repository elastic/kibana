/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { ThemeProvider } from 'styled-components';
import { euiLightVars } from '@kbn/ui-theme';
import type { Story, ComponentMeta, ComponentStory } from '@storybook/react';

import { AutoRefreshButton } from './auto_refresh_button';
import type { AutoRefreshButtonProps } from './auto_refresh_button';

const rulesTableUtilityBar: ComponentMeta<typeof AutoRefreshButton> = {
  title: 'Rule Mgmt/Rules Table/AutoRefreshButton',
  component: AutoRefreshButton,
  decorators: [
    (Story: Story) => (
      <ThemeProvider theme={() => ({ eui: euiLightVars, darkMode: false })}>
        <Story />
      </ThemeProvider>
    ),
  ],
  argTypes: {
    isRefreshOn: { type: 'boolean', defaultValue: true },
    isDisabled: { type: 'boolean', defaultValue: false },
    reFetchRules: { action: 'onReFetchRules' },
    setIsRefreshOn: { action: 'onSetIsRefreshOn' },
  },
};

export default rulesTableUtilityBar;

const Template: ComponentStory<typeof AutoRefreshButton> = (args: AutoRefreshButtonProps) => (
  <AutoRefreshButton {...args} />
);

export const Default = Template.bind({});
Default.args = {};
