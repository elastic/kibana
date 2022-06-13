/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Meta, Story } from '@storybook/react';
import React, { ComponentProps } from 'react';
import { MemoryRouter } from 'react-router-dom';
import { CoreStart } from '../../../../../../../../src/core/public';
import { createKibanaReactContext } from '../../../../../../../../src/plugins/kibana_react/public';
import { ServiceHealthStatus } from '../../../../../common/service_health_status';
import { ServiceInventoryFieldName } from '../../../../../common/service_inventory';
import type { ApmPluginContextValue } from '../../../../context/apm_plugin/apm_plugin_context';
import { MockApmPluginContextWrapper } from '../../../../context/apm_plugin/mock_apm_plugin_context';
import { ServiceList } from './';
import { items } from './__fixtures__/service_api_mock_data';

type Args = ComponentProps<typeof ServiceList>;

const coreMock = {
  http: {
    get: async () => {
      return { fallBackToTransactions: false };
    },
  },
  notifications: { toasts: { add: () => {} } },
  uiSettings: { get: () => ({}) },
} as unknown as CoreStart;

const KibanaReactContext = createKibanaReactContext(coreMock);

const stories: Meta<Args> = {
  title: 'app/ServiceInventory/ServiceList',
  component: ServiceList,
  decorators: [
    (StoryComponent) => {
      return (
        <KibanaReactContext.Provider>
          <MemoryRouter
            initialEntries={['/services?rangeFrom=now-15m&rangeTo=now']}
          >
            <MockApmPluginContextWrapper
              value={{ core: coreMock } as unknown as ApmPluginContextValue}
            >
              <StoryComponent />
            </MockApmPluginContextWrapper>
          </MemoryRouter>
        </KibanaReactContext.Provider>
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
  sortFn: (sortItems) => sortItems,
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
