/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiCard } from '@elastic/eui';
import { I18nProvider } from '@kbn/i18n-react';
import { KibanaContextProvider } from '@kbn/kibana-react-plugin/public';
import type { Meta, Story } from '@storybook/react/types-6-0';
import React from 'react';
import { decorateWithGlobalStorybookThemeProviders } from '../../../../../../test_utils/use_global_storybook_theme';
import { LinkToUptime, type LinkToUptimeProps } from './link_to_uptime';

const mockServices = {
  share: {
    url: {
      locators: {
        get: () => ({
          navigate: () =>
            `https://kibana:8080/base-path/app/uptime/?search=host.name: "host1" OR host.ip: "192.168.0.1" OR monitor.ip: "192.168.0.1"`,
        }),
      },
    },
  },
};

export default {
  title: 'infra/Host Details View/Components/Links',
  decorators: [
    (wrappedStory) => <EuiCard title="Link to Uptime">{wrappedStory()}</EuiCard>,
    (wrappedStory) => (
      <I18nProvider>
        <KibanaContextProvider services={mockServices}>{wrappedStory()}</KibanaContextProvider>
      </I18nProvider>
    ),
    decorateWithGlobalStorybookThemeProviders,
  ],
  component: LinkToUptime,
  args: {
    nodeType: 'host',
    node: {
      name: 'host1',
      id: 'host1-macOS',
      title: {
        name: 'host1',
        cloudProvider: null,
      },
      os: 'macOS',
      ip: '192.168.0.1',
      rx: 123179.18222222221,
      tx: 123030.54555555557,
      memory: 0.9044444444444445,
      cpu: 0.3979674157303371,
      diskLatency: 0.15291777273162221,
      memoryTotal: 34359738368,
    },
  },
} as Meta;

const TemplateUptime: Story<LinkToUptimeProps> = (args) => {
  return <LinkToUptime {...args} />;
};

export const UptimeLink = TemplateUptime.bind({});
UptimeLink.args = {};
