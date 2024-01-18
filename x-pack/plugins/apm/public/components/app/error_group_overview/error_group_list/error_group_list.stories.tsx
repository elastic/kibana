/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Meta, Story } from '@storybook/react';
import React, { ComponentProps } from 'react';
import { MemoryRouter } from 'react-router-dom';
import { MockApmPluginContextWrapper } from '../../../../context/apm_plugin/mock_apm_plugin_context';
import { MockUrlParamsContextProvider } from '../../../../context/url_params_context/mock_url_params_context_provider';

import { ErrorGroupList } from '.';

type Args = ComponentProps<typeof ErrorGroupList>;

const stories: Meta<Args> = {
  title: 'app/ErrorGroupOverview/ErrorGroupList',
  component: ErrorGroupList,
  decorators: [
    (StoryComponent) => {
      return (
        <MemoryRouter
          initialEntries={[
            '/services/{serviceName}/errors?rangeFrom=now-15m&rangeTo=now',
          ]}
        >
          <MockApmPluginContextWrapper>
            <MockUrlParamsContextProvider>
              <StoryComponent />
            </MockUrlParamsContextProvider>
          </MockApmPluginContextWrapper>
        </MemoryRouter>
      );
    },
  ],
};
export default stories;

export const Example: Story<Args> = (args) => {
  return <ErrorGroupList {...args} />;
};
Example.args = {
  serviceName: 'test service',
  initialPageSize: 5,
};

export const EmptyState: Story<Args> = (args) => {
  return <ErrorGroupList {...args} />;
};
EmptyState.args = {
  serviceName: 'test service',
  initialPageSize: 5,
};
