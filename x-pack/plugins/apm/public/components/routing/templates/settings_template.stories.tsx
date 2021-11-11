/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Meta, Story } from '@storybook/react';
import React, { ComponentProps } from 'react';
import type { MockContextValue } from '../../../context/mock/mock_context';
import type { ApmPluginStartDeps } from '../../../plugin';
import { SettingsTemplate } from './settings_template';

type Args = ComponentProps<typeof SettingsTemplate> & MockContextValue;

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
  args: { pluginsStart: pluginsStartMock as unknown as ApmPluginStartDeps },
};
export default stories;

export const Example: Story<Args> = (args) => {
  return <SettingsTemplate {...args} />;
};
Example.args = {
  children: <>test</>,
  selectedTab: 'agent-configurations',
};
