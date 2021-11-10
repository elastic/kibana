/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Meta, Story } from '@storybook/react';
import React, { ComponentProps } from 'react';
import { CoreStart } from '../../../../../../../../src/core/public';
import { ServiceHealthStatus } from '../../../../../common/service_health_status';
import { MockApmAppContextProvider } from '../../../../context/mock_apm_app/mock_apm_app_context';
import { ServiceList } from './';
import { items } from './__fixtures__/service_api_mock_data';

type Args = ComponentProps<typeof ServiceList>;

const coreMock = {
  http: {
    get: () => {
      return { fallBackToTransactions: false };
    },
  },
} as unknown as CoreStart;

const stories: Meta<Args> = {
  title: 'app/ServiceInventory/ServiceList',
  component: ServiceList,
  decorators: [
    (StoryComponent) => {
      return (
        <MockApmAppContextProvider
          value={{
            coreStart: coreMock,
            path: '/services?rangeFrom=now-15m&rangeTo=now',
          }}
        >
          <StoryComponent />
        </MockApmAppContextProvider>
      );
    },
  ],
};
export default stories;

export const Example: Story<Args> = (args) => {
  return <ServiceList {...args} />;
};
Example.args = {
  isLoading: false,
  items,
};

export const EmptyState: Story<Args> = (args) => {
  return <ServiceList {...args} />;
};
EmptyState.args = {
  isLoading: false,
  items: [],
};

export const WithHealthWarnings: Story<Args> = (args) => {
  return <ServiceList {...args} />;
};
WithHealthWarnings.args = {
  isLoading: false,
  items: items.map((item) => ({
    ...item,
    healthStatus: ServiceHealthStatus.warning,
  })),
};
