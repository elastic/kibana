/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type { Meta, Story } from '@storybook/react/types-6-0';
import { DecorateWithKibanaContext } from '../../__stories__/decorator';
import { Processes, type ProcessesProps } from './processes';
import { decorateWithGlobalStorybookThemeProviders } from '../../../../test_utils/use_global_storybook_theme';

const stories: Meta<ProcessesProps> = {
  title: 'infra/Asset Details View/Components/Processes',
  decorators: [decorateWithGlobalStorybookThemeProviders, DecorateWithKibanaContext],
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
};

const Template: Story<ProcessesProps> = (args) => {
  return <Processes {...args} />;
};

export const Default = Template.bind({});
Default.args = {};

export const OnlySummary = Template.bind({});
OnlySummary.parameters = {
  apiResponse: {
    mock: 'onlySummary',
  },
};

export const OnlyProcesses = Template.bind({});
OnlyProcesses.parameters = {
  apiResponse: {
    mock: 'onlyProcesses',
  },
};

export const NoData = Template.bind({});
NoData.parameters = {
  apiResponse: {
    mock: 'noData',
  },
};

export const LoadingState = Template.bind({});
LoadingState.parameters = {
  apiResponse: {
    mock: 'loading',
  },
};

export const ErrorState = Template.bind({});
ErrorState.parameters = {
  apiResponse: {
    mock: 'error',
  },
};

export default stories;
