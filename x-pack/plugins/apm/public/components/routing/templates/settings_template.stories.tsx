/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Meta, Story } from '@storybook/react';
import type { CoreStart, DocLinksStart } from '@kbn/core/public';
import React, { ComponentProps } from 'react';
import { MemoryRouter } from 'react-router-dom';
import { createKibanaReactContext } from '@kbn/kibana-react-plugin/public';
import type { ApmPluginContextValue } from '../../../context/apm_plugin/apm_plugin_context';
import { MockApmPluginContextWrapper } from '../../../context/apm_plugin/mock_apm_plugin_context';
import { SettingsTemplate } from './settings_template';

type Args = ComponentProps<typeof SettingsTemplate>;

const coreMock = {
  notifications: { toasts: { add: () => {} } },
  usageCollection: { reportUiCounter: () => {} },
  observability: {
    navigation: {
      PageTemplate: () => {
        return <>hello world</>;
      },
    },
  },
  http: {
    basePath: {
      prepend: (path: string) => `/basepath${path}`,
      get: () => `/basepath`,
    },
    get: async () => ({}),
  },
  docLinks: {
    DOC_LINK_VERSION: '0',
    ELASTIC_WEBSITE_URL: 'https://www.elastic.co/',
    links: {
      apm: {},
      observability: { guide: '' },
    },
  } as unknown as DocLinksStart,
} as unknown as Partial<CoreStart>;

const KibanaReactContext = createKibanaReactContext(coreMock);

const stories: Meta<Args> = {
  title: 'routing/templates/SettingsTemplate',
  component: SettingsTemplate,
  decorators: [
    (StoryComponent) => {
      return (
        <MemoryRouter>
          <KibanaReactContext.Provider>
            <MockApmPluginContextWrapper
              value={{ core: coreMock } as unknown as ApmPluginContextValue}
            >
              <StoryComponent />
            </MockApmPluginContextWrapper>
          </KibanaReactContext.Provider>
        </MemoryRouter>
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
