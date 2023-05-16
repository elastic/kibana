/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiCard } from '@elastic/eui';
import { I18nProvider } from '@kbn/i18n-react';
import type { Meta, Story } from '@storybook/react/types-6-0';
import React from 'react';
import { decorateWithGlobalStorybookThemeProviders } from '../../../../../../test_utils/use_global_storybook_theme';
import { DecorateWithKibanaContext } from './processes.story_decorators';

import { Processes, ProcessesProps } from './processes';

export default {
  title: 'infra/Host Details View/Components/Processes',
  decorators: [
    (wrappedStory) => <EuiCard title="Processes">{wrappedStory()}</EuiCard>,
    (wrappedStory) => <I18nProvider>{wrappedStory()}</I18nProvider>,
    decorateWithGlobalStorybookThemeProviders,
    DecorateWithKibanaContext,
  ],
  component: Processes,
  args: {
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
    nodeType: 'host',
    currentTime: 1683630468,
  },
} as Meta;

const Template: Story<ProcessesProps> = (args) => {
  return <Processes {...args} />;
};

export const DefaultProcessesAndSummary = Template.bind({});
DefaultProcessesAndSummary.args = {};

export const Loading = Template.bind({});
Loading.parameters = {
  show: {
    contentType: 'loading',
  },
};

export const OnlySummary = Template.bind({});
OnlySummary.parameters = {
  show: {
    contentType: 'onlySummary',
  },
};

export const OnlyProcesses = Template.bind({});
OnlyProcesses.parameters = {
  show: {
    contentType: 'onlyProcesses',
  },
};

export const NoData = Template.bind({});
NoData.parameters = {
  show: {
    contentType: 'noData',
  },
};
