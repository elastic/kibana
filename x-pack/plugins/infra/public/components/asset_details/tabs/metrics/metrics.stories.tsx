/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type { Meta, Story } from '@storybook/react/types-6-0';

import { Metrics, type MetricsProps } from './metrics';
import { decorateWithGlobalStorybookThemeProviders } from '../../../../test_utils/use_global_storybook_theme';
import { DecorateWithKibanaContext } from '../../__stories__/decorator';

const stories: Meta<MetricsProps> = {
  title: 'infra/Asset Details View/Components/Metrics',
  decorators: [decorateWithGlobalStorybookThemeProviders, DecorateWithKibanaContext],
  component: Metrics,
  args: {
    nodeName: 'host-1',
    currentTime: 1683630468,
    nodeType: 'host',
  },
};

const Template: Story<MetricsProps> = (args) => {
  return <Metrics {...args} />;
};

export const Default = Template.bind({});

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

export default stories;
