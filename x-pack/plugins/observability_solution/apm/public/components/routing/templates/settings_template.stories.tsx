/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreStart } from '@kbn/core/public';
import type { Meta, Story } from '@storybook/react';
import { noop } from 'lodash';
import React, { ComponentProps } from 'react';
import type { ApmPluginContextValue } from '../../../context/apm_plugin/apm_plugin_context';
import { MockApmPluginStorybook } from '../../../context/apm_plugin/mock_apm_plugin_storybook';
import { mockApmApiCallResponse } from '../../../services/rest/call_apm_api_spy';
import { SettingsTemplate } from './settings_template';

type Args = ComponentProps<typeof SettingsTemplate>;

const coreMock = {
  observabilityShared: {
    navigation: {
      PageTemplate: () => {
        return <>hello world</>;
      },
    },
  },
  observabilityAIAssistant: {
    service: { setScreenContext: () => noop },
  },
} as unknown as Partial<CoreStart>;

const configMock = {
  featureFlags: {
    agentConfigurationAvailable: true,
    configurableIndicesAvailable: true,
  },
};

const stories: Meta<Args> = {
  title: 'routing/templates/SettingsTemplate',
  component: SettingsTemplate,
  decorators: [
    (StoryComponent) => {
      mockApmApiCallResponse('GET /internal/apm/has_data', (params) => ({
        hasData: true,
      }));

      return (
        <MockApmPluginStorybook
          apmContext={
            {
              core: coreMock,
              config: configMock,
            } as unknown as ApmPluginContextValue
          }
        >
          <StoryComponent />
        </MockApmPluginStorybook>
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
  selectedTab: 'agent-configuration',
};
