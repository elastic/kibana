/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { ComponentProps } from 'react';
import { Meta, Story } from '@storybook/react';
import { EuiCallOut, EuiSpacer } from '@elastic/eui';
import { RulesSettingsLink } from './rules_settings_link';
import { StorybookContextDecorator } from '../../../../.storybook/decorator';
import { getDefaultCapabilities } from '../../../../.storybook/context/capabilities';

type Args = ComponentProps<typeof RulesSettingsLink>;

export default {
  title: 'app/RulesSettingsLink',
  component: RulesSettingsLink,
} as Meta<Args>;

const Template: Story<Args> = () => {
  return <RulesSettingsLink />;
};

export const withAllPermission = Template.bind({});

withAllPermission.decorators = [
  (StoryComponent, context) => (
    <StorybookContextDecorator
      context={context}
      servicesApplicationOverride={{
        capabilities: getDefaultCapabilities({
          rulesSettings: {
            show: true,
            save: true,
            readFlappingSettingsUI: true,
            writeFlappingSettingsUI: true,
          },
        }),
      }}
    >
      <StoryComponent />
    </StorybookContextDecorator>
  ),
];

export const withReadPermission = Template.bind({});

withReadPermission.decorators = [
  (StoryComponent, context) => (
    <StorybookContextDecorator
      context={context}
      servicesApplicationOverride={{
        capabilities: getDefaultCapabilities({
          rulesSettings: {
            show: true,
            save: false,
            readFlappingSettingsUI: true,
            writeFlappingSettingsUI: false,
          },
        }),
      }}
    >
      <StoryComponent />
    </StorybookContextDecorator>
  ),
];

export const withNoPermission = Template.bind({});

withNoPermission.decorators = [
  (StoryComponent, context) => (
    <StorybookContextDecorator
      context={context}
      servicesApplicationOverride={{
        capabilities: getDefaultCapabilities({
          rulesSettings: {
            show: false,
            save: false,
            readFlappingSettingsUI: false,
            writeFlappingSettingsUI: false,
          },
        }),
      }}
    >
      <EuiCallOut title="No Permissions">
        When the user does not have capabilities to view rules settings, the entire link is hidden
      </EuiCallOut>
      <EuiSpacer />
      <StoryComponent />
    </StorybookContextDecorator>
  ),
];
