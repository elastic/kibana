/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { I18nProvider } from '@kbn/i18n-react';
import { Story } from '@storybook/react';
import React from 'react';
import { DataStreamSelector, DataStreamSelectorProps } from './data_stream_selector';

export default {
  component: DataStreamSelector,
  title: 'observability_logs/DataStreamSelector',
  decorators: [(wrappedStory) => <I18nProvider>{wrappedStory()}</I18nProvider>],
};

const DataStreamSelectorTemplate: Story<DataStreamSelectorProps> = (args) => (
  <DataStreamSelector {...args} />
);

export const Basic = DataStreamSelectorTemplate.bind({});
Basic.args = {
  title: 'Current stream name',
  integrations: [
    {
      name: 'atlassian_jira',
      version: '1.8.0',
      status: 'installed',
      dataStreams: [
        {
          name: 'Atlassian metrics stream',
          title: 'metrics-*',
        },
        {
          name: 'Atlassian secondary',
          title: 'metrics-*',
        },
      ],
    },
    {
      name: 'docker',
      version: '2.4.3',
      status: 'installed',
      dataStreams: [
        {
          name: 'Docker stream',
          title: 'metrics-*',
        },
      ],
    },
    {
      name: 'system',
      version: '1.27.1',
      status: 'installed',
      dataStreams: [
        {
          name: 'System metrics logs',
          title: 'metrics-*',
        },
      ],
    },
  ],
  uncategorizedStreams: [{ name: 'metrics-*' }, { name: 'logs-*' }],
  // eslint-disable-next-line no-console
  onStreamSelected: async (stream) => console.log('Create ad hoc view for stream: ', stream),
  // eslint-disable-next-line no-console
  onStreamsEntryClick: () => console.log('Load uncategorized streams...'),
};
