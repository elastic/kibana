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
    nodeName: 'host1',
    nodeType: 'host',
    currentTimestamp: 1683630468,
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
