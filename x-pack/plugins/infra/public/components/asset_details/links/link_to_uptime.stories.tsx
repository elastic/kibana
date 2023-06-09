/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Meta, Story } from '@storybook/react/types-6-0';
import React from 'react';
import { decorateWithGlobalStorybookThemeProviders } from '../../../test_utils/use_global_storybook_theme';
import { DecorateWithKibanaContext } from '../__stories__/decorator';
import { LinkToUptime, type LinkToUptimeProps } from './link_to_uptime';

const stories: Meta<LinkToUptimeProps> = {
  title: 'infra/Asset Details View/Components/Links',
  decorators: [decorateWithGlobalStorybookThemeProviders, DecorateWithKibanaContext],
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
};

const TemplateUptime: Story<LinkToUptimeProps> = (args) => {
  return <LinkToUptime {...args} />;
};

export const UptimeLink = TemplateUptime.bind({});

export default stories;
