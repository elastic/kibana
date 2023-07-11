/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type { Meta, Story } from '@storybook/react/types-6-0';

import { Anomalies, type AnomaliesProps } from './anomalies';
import { decorateWithGlobalStorybookThemeProviders } from '../../../../test_utils/use_global_storybook_theme';
import { DecorateWithKibanaContext } from '../../__stories__/decorator';

const stories: Meta<AnomaliesProps> = {
  title: 'infra/Asset Details View/Components/Anomalies',
  decorators: [decorateWithGlobalStorybookThemeProviders, DecorateWithKibanaContext],
  component: Anomalies,
  args: {
    nodeName: 'host-1',
    onClose: () => {},
  },
};

const Template: Story<AnomaliesProps> = (args) => {
  return <Anomalies {...args} />;
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
