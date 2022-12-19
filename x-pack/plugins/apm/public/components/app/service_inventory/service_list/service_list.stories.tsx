/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { CoreStart } from '@kbn/core/public';
import { Meta, Story } from '@storybook/react';
import React, { ComponentProps } from 'react';
import { ServiceList } from '.';
import { ServiceHealthStatus } from '../../../../../common/service_health_status';
import { ServiceInventoryFieldName } from '../../../../../common/service_inventory';
import type { ApmPluginContextValue } from '../../../../context/apm_plugin/apm_plugin_context';
import { MockApmPluginStorybook } from '../../../../context/apm_plugin/mock_apm_plugin_storybook';
import { items } from './__fixtures__/service_api_mock_data';

type Args = ComponentProps<typeof ServiceList>;

const coreMock = {
  http: {
    get: async () => {
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
        <MockApmPluginStorybook
          apmContext={{ core: coreMock } as unknown as ApmPluginContextValue}
          routePath="/services?rangeFrom=now-15m&rangeTo=now"
        >
          <StoryComponent />
        </MockApmPluginStorybook>
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
  displayHealthStatus: true,
  initialSortField: ServiceInventoryFieldName.HealthStatus,
  initialSortDirection: 'desc',
  initialPageSize: 25,
  sortFn: (sortItems) => sortItems,
};

export const EmptyState: Story<Args> = (args) => {
  return <ServiceList {...args} />;
};
EmptyState.args = {
  isLoading: false,
  items: [],
  displayHealthStatus: true,
  initialSortField: ServiceInventoryFieldName.HealthStatus,
  initialSortDirection: 'desc',
  initialPageSize: 25,
  sortFn: (sortItems) => sortItems,
};

export const WithHealthWarnings: Story<Args> = (args) => {
  return <ServiceList {...args} />;
};
WithHealthWarnings.args = {
  isLoading: false,
  initialPageSize: 25,
  items: items.map((item) => ({
    ...item,
    healthStatus: ServiceHealthStatus.warning,
  })),
  sortFn: (sortItems) => sortItems,
};
