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
  integrations: [],
  uncategorizedStreams: [],
  // eslint-disable-next-line no-console
  onUncategorizedClick: () => console.log('Load uncategorized streams...'),
};
