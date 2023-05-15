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
import { decorateWithGlobalStorybookThemeProviders } from '../../../../../../test_utils/use_global_storybook_theme';
import { Table, Props } from './table';

const mockServices = {
  data: {
    query: {
      filterManager: { filterManagerService: { addFilters: () => {}, removeFilter: () => {} } },
    },
  },
  notifications: { toasts: { toastsService: { addSuccess: () => {} } } },
  telemetry: () => {},
};

export default {
  title: 'infra/Host Details View/Components/Metadata Table',
  decorators: [
    (wrappedStory) => <EuiCard title="Metadata Table">{wrappedStory()}</EuiCard>,
    (wrappedStory) => (
      <I18nProvider>
        <KibanaContextProvider services={mockServices}>{wrappedStory()}</KibanaContextProvider>
      </I18nProvider>
    ),
    decorateWithGlobalStorybookThemeProviders,
  ],
  component: Table,
  args: {
    rows: [
      { name: 'host.hostname', value: 'host 1' },
      {
        name: 'host.ip',
        value: [
          '192.168.0.1',
          '192.168.0.2',
          '192.168.0.3',
          '192.168.0.4',
          '192.168.0.5',
          '192.168.0.6',
          '192.168.0.7',
          '192.168.0.8',
          '192.168.0.9',
          '192.168.0.10',
        ],
      },
      { name: 'host.os.name', value: 'macOs' },
      { name: 'host.os.family', value: 'darwin' },
      { name: 'host.os.platform', value: 'darwin' },
      { name: 'host.os.version', value: '13.3.1' },
      { name: 'agent.version', value: '8.5.0' },
    ],
    loading: false,
  },
} as Meta;

const Template: Story<Props> = (args) => {
  return <Table {...args} />;
};

export const BasicData = Template.bind({});
BasicData.args = {};

export const CloudData = Template.bind({});
CloudData.args = {
  rows: [
    { name: 'host.hostname', value: 'host 2' },
    {
      name: 'host.ip',
      value: [
        '11.128.0.17',
        'test::4001:fff:test:11',
        '169.254.123.1',
        '11.22.33.44',
        'test::d8d1:123:frr4:ae6d',
        '11.22.33.44',
        'test::8ce7:80ff:fe33:7a75',
        '11.22.33.44',
        'test::800f:ebff:fecc:f658',
        '11.22.33.44',
        'test::3333:asdf:fe1a:72e0',
        '11.22.33.44',
        'test::c0c8:e8ff:fec5:1234',
        '11.22.33.44',
        'test::ccbf:4fff:fe3a:6574',
        '11.22.33.44',
        'test::2222:53ff:asdf:5sda',
        '11.22.33.44',
        'test::cdb:14ff:asdf:5666',
        '11.22.33.44',
        'test::11ba:3dff:asdf:d666',
        '11.22.33.44',
        'test::ece8:eeee:2342:d334',
        '11.22.33.44',
        'test::2402:d6ff:fe73:1234',
      ],
    },
    { name: 'host.os.name', value: 'Ubuntu' },
    { name: 'host.os.family', value: 'debian' },
    { name: 'host.os.platform', value: 'ubuntu' },
    { name: 'host.os.version', value: '5.15.65+' },
    { name: 'cloud.availability_zone', value: 'us-central1-c' },
    { name: 'cloud.machine.type', value: 'n1-standard-4' },
    { name: 'cloud.provider', value: 'gcp' },
    { name: 'agent.version', value: '8.9.0' },
  ],
  loading: false,
};

export const Loading = Template.bind({});
Loading.args = {
  loading: true,
  rows: [],
};

export const NoMetadata = Template.bind({});
NoMetadata.args = {
  loading: false,
  rows: [],
};
