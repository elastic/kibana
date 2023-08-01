/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Meta, Story } from '@storybook/react/types-6-0';
import React from 'react';
import { decorateWithGlobalStorybookThemeProviders } from '../../../../test_utils/use_global_storybook_theme';
import { Metadata, MetadataProps } from './metadata';
import { DecorateWithKibanaContext } from '../../__stories__/decorator';

const stories: Meta<MetadataProps> = {
  title: 'infra/Asset Details View/Components/Metadata',
  decorators: [decorateWithGlobalStorybookThemeProviders, DecorateWithKibanaContext],
  component: Metadata,
  args: {
    dateRange: {
      from: '2023-04-09T11:07:49Z',
      to: '2023-04-09T11:23:49Z',
    },
    nodeType: 'host',
    nodeName: 'host-1',
    showActionsColumn: false,
  },
};

const Template: Story<MetadataProps> = (args) => {
  return <Metadata {...args} />;
};

export const Default = Template.bind({});

export const WithActions = Template.bind({});
WithActions.args = {
  showActionsColumn: true,
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
