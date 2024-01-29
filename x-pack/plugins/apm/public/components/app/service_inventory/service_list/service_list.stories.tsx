/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { CoreStart } from '@kbn/core/public';
import { Meta, Story } from '@storybook/react';
import React, { ComponentProps } from 'react';
import { FETCH_STATUS } from '../../../../hooks/use_fetcher';
import { ServiceList } from '.';
import { ServiceHealthStatus } from '../../../../../common/service_health_status';
import { ServiceInventoryFieldName } from '../../../../../common/service_inventory';
import type { ApmPluginContextValue } from '../../../../context/apm_plugin/apm_plugin_context';
import { MockApmPluginStorybook } from '../../../../context/apm_plugin/mock_apm_plugin_storybook';
import { mockApmApiCallResponse } from '../../../../services/rest/call_apm_api_spy';
import { items, overflowItems } from './__fixtures__/service_api_mock_data';

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
      mockApmApiCallResponse(
        'GET /internal/apm/fallback_to_transactions',
        () => ({ fallbackToTransactions: false })
      );
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

export const ServiceListWithItems: Story<Args> = (args) => {
  return <ServiceList {...args} />;
};
ServiceListWithItems.args = {
  status: FETCH_STATUS.SUCCESS,
  items,
  displayHealthStatus: true,
  initialSortField: ServiceInventoryFieldName.HealthStatus,
  initialSortDirection: 'desc',
  initialPageSize: 25,
  sortFn: (sortItems) => sortItems,
};

export const ServiceListEmptyState: Story<Args> = (args) => {
  return <ServiceList {...args} />;
};
ServiceListEmptyState.args = {
  status: FETCH_STATUS.SUCCESS,
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
  status: FETCH_STATUS.SUCCESS,
  initialPageSize: 25,
  items: items.map((item) => ({
    ...item,
    healthStatus: ServiceHealthStatus.warning,
  })),
  sortFn: (sortItems) => sortItems,
};

export const ServiceListWithOverflowBucket: Story<Args> = (args) => {
  return <ServiceList {...args} />;
};

ServiceListWithOverflowBucket.args = {
  status: FETCH_STATUS.SUCCESS,
  items: overflowItems,
  displayHealthStatus: false,
  initialSortField: ServiceInventoryFieldName.HealthStatus,
  initialSortDirection: 'desc',
  initialPageSize: 25,
  sortFn: (sortItems) => sortItems,
};
