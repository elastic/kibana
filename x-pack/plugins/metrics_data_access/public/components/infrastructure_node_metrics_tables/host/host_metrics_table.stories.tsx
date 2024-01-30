/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiCard } from '@elastic/eui';
import { I18nProvider } from '@kbn/i18n-react';
import { KibanaContextProvider } from '@kbn/kibana-react-plugin/public';
import type { Meta, Story } from '@storybook/react/types-6-0';
import React from 'react';
import { decorateWithGlobalStorybookThemeProviders } from '../../../test_utils/use_global_storybook_theme';
import type { HostMetricsTableProps } from './host_metrics_table';
import { HostMetricsTable } from './host_metrics_table';
import { HostNodeMetricsRow } from './use_host_metrics_table';

const mockServices = {
  application: {
    getUrlForApp: (app: string, { path }: { path: string }) => `your-kibana/app/${app}/${path}`,
  },
};

export default {
  title: 'infra/Node Metrics Tables/Host',
  decorators: [
    (wrappedStory) => <EuiCard title="Host metrics">{wrappedStory()}</EuiCard>,
    (wrappedStory) => (
      <I18nProvider>
        <KibanaContextProvider services={mockServices}>{wrappedStory()}</KibanaContextProvider>
      </I18nProvider>
    ),
    decorateWithGlobalStorybookThemeProviders,
  ],
  component: HostMetricsTable,
  args: {
    data: {
      state: 'empty-indices',
    },
    isLoading: false,
    sortState: {
      direction: 'desc',
      field: 'averageCpuUsagePercent',
    },
    timerange: {
      from: 'now-15m',
      to: 'now',
    },
  },
  argTypes: {
    setSortState: {
      action: 'Sort field or direction changed',
    },
    setCurrentPageIndex: {
      action: 'Page changed',
    },
  },
} as Meta<HostMetricsTableProps>;

const loadedHosts: HostNodeMetricsRow[] = [
  {
    name: 'gke-edge-oblt-pool-1-9a60016d-lgg1',
    cpuCount: 2,
    averageCpuUsagePercent: 99,
    totalMemoryMegabytes: 1024,
    averageMemoryUsagePercent: 34,
  },
  {
    name: 'gke-edge-oblt-pool-1-9a60016d-lgg2',
    cpuCount: 4,
    averageCpuUsagePercent: 74,
    totalMemoryMegabytes: 2450,
    averageMemoryUsagePercent: 13,
  },
  {
    name: 'gke-edge-oblt-pool-1-9a60016d-lgg3',
    cpuCount: 8,
    averageCpuUsagePercent: 56,
    totalMemoryMegabytes: 4810,
    averageMemoryUsagePercent: 74,
  },
  {
    name: 'gke-edge-oblt-pool-1-9a60016d-lgg4',
    cpuCount: 16,
    averageCpuUsagePercent: 34,
    totalMemoryMegabytes: 8123,
    averageMemoryUsagePercent: 56,
  },
  {
    name: 'gke-edge-oblt-pool-1-9a60016d-lgg5',
    cpuCount: 32,
    averageCpuUsagePercent: 13,
    totalMemoryMegabytes: 16792,
    averageMemoryUsagePercent: 99,
  },
];

const Template: Story<HostMetricsTableProps> = (args) => {
  return <HostMetricsTable {...args} />;
};

export const Basic = Template.bind({});
Basic.args = {
  data: {
    state: 'data',
    currentPageIndex: 1,
    pageCount: 10,
    rows: loadedHosts,
  },
};

export const Loading = Template.bind({});
Loading.args = {
  isLoading: true,
};

export const Reloading = Template.bind({});
Reloading.args = {
  data: {
    state: 'data',
    currentPageIndex: 1,
    pageCount: 10,
    rows: loadedHosts,
  },
  isLoading: true,
};

export const MissingIndices = Template.bind({});
MissingIndices.args = {
  data: {
    state: 'no-indices',
  },
};

export const EmptyIndices = Template.bind({});
EmptyIndices.args = {
  data: {
    state: 'empty-indices',
  },
};

export const FailedToLoadSource = Template.bind({});
FailedToLoadSource.args = {
  data: {
    state: 'error',
    errors: [new Error('Failed to load source configuration')],
  },
};

export const FailedToLoadMetrics = Template.bind({});
FailedToLoadMetrics.args = {
  data: {
    state: 'error',
    errors: [new Error('Failed to load metrics')],
  },
};
