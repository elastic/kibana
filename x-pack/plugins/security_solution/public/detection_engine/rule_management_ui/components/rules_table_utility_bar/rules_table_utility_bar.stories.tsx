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

import { RulesTableUtilityBar } from './rules_table_utility_bar';
import type { RulesTableUtilityBarProps } from './rules_table_utility_bar';

const rulesTableUtilityBar: ComponentMeta<typeof RulesTableUtilityBar> = {
  title: 'Rule Mgmt/Rules Table/UtilityBar',
  component: RulesTableUtilityBar,
  decorators: [
    (Story: Story) => (
      <ThemeProvider theme={() => ({ eui: euiLightVars, darkMode: false })}>
        <Story />
      </ThemeProvider>
    ),
  ],
  argTypes: {
    canBulkEdit: { type: 'boolean', defaultValue: false },
    onGetBulkItemsPopoverContent: { action: 'onGetBulkItemsPopoverContent' },
    onToggleSelectAll: { action: 'onToggleSelectAll' },
  },
};

export default rulesTableUtilityBar;

const Template: ComponentStory<typeof RulesTableUtilityBar> = (args: RulesTableUtilityBarProps) => (
  <RulesTableUtilityBar {...args} />
);

export const Default = Template.bind({});
Default.args = {
  isBulkActionInProgress: false,
};
