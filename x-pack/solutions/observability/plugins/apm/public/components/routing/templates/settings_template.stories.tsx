/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreStart } from '@kbn/core/public';
import type { StoryObj, Meta } from '@storybook/react';
import { noop } from 'lodash';
import type { ComponentProps } from 'react';
import React from 'react';
import { mockApmApiCallResponse } from '../../../services/rest/storybook_mock_http';
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
  parameters: {
    apmContext: {
      core: coreMock,
      config: configMock,
    },
  },
  decorators: [
    (StoryComponent) => {
      mockApmApiCallResponse('GET /internal/apm/has_data', (params) => ({
        hasData: true,
      }));

      return <StoryComponent />;
    },
  ],
};
export default stories;

export const Example: StoryObj<Args> = {
  render: (args) => {
    return <SettingsTemplate {...args} />;
  },

  args: {
    children: <>test</>,
    selectedTab: 'agent-configuration',
  },
};
