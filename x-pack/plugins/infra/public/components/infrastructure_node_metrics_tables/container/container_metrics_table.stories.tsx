/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiCard } from '@elastic/eui';
import { I18nProvider } from '@kbn/i18n-react';
import type { Meta } from '@storybook/react/types-6-0';
import React from 'react';
import { KibanaContextProvider } from '@kbn/kibana-react-plugin/public';
import { decorateWithGlobalStorybookThemeProviders } from '../../../test_utils/use_global_storybook_theme';
import { ContainerMetricsTable } from './container_metrics_table';
import type { ContainerMetricsTableProps } from './container_metrics_table';

const mockServices = {
  application: {
    getUrlForApp: (app: string, { path }: { path: string }) => `your-kibana/app/${app}/${path}`,
  },
};

export default {
  title: 'infra/Node Metrics Tables/Container',
  decorators: [
    (wrappedStory) => <EuiCard title="Container metrics">{wrappedStory()}</EuiCard>,
    (wrappedStory) => (
      <I18nProvider>
        <KibanaContextProvider services={mockServices}>{wrappedStory()}</KibanaContextProvider>
      </I18nProvider>
    ),
    decorateWithGlobalStorybookThemeProviders,
  ],
  component: ContainerMetricsTable,
  argTypes: {
    setSortState: {
      action: 'Sort field or direction changed',
    },
    setCurrentPageIndex: {
      action: 'Page changed',
    },
  },
} as Meta;

const storyArgs: Omit<ContainerMetricsTableProps, 'setSortState' | 'setCurrentPageIndex'> = {
  isLoading: false,
  containers: [
    {
      name: 'gke-edge-oblt-pool-1-9a60016d-lgg1',
      uptime: 23000000,
      averageCpuUsagePercent: 99,
      averageMemoryUsageMegabytes: 34,
    },
    {
      name: 'gke-edge-oblt-pool-1-9a60016d-lgg2',
      uptime: 43000000,
      averageCpuUsagePercent: 72,
      averageMemoryUsageMegabytes: 68,
    },
    {
      name: 'gke-edge-oblt-pool-1-9a60016d-lgg3',
      uptime: 53000000,
      averageCpuUsagePercent: 54,
      averageMemoryUsageMegabytes: 132,
    },
    {
      name: 'gke-edge-oblt-pool-1-9a60016d-lgg4',
      uptime: 63000000,
      averageCpuUsagePercent: 34,
      averageMemoryUsageMegabytes: 264,
    },
    {
      name: 'gke-edge-oblt-pool-1-9a60016d-lgg5',
      uptime: 83000000,
      averageCpuUsagePercent: 13,
      averageMemoryUsageMegabytes: 512,
    },
  ],
  currentPageIndex: 0,
  pageCount: 10,
  sortState: {
    direction: 'desc',
    field: 'averageCpuUsagePercent',
  },
  timerange: {
    from: 'now-15m',
    to: 'now',
  },
};

export const Demo = (args: ContainerMetricsTableProps) => {
  return <ContainerMetricsTable {...args} />;
};
Demo.args = storyArgs;
