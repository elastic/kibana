/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { I18nProvider } from '@kbn/i18n-react';
import type { Meta, Story } from '@storybook/react';
import React from 'react';
import { decorateWithGlobalStorybookThemeProviders } from '../../test_utils/use_global_storybook_theme';
import { LogStream, LogStreamProps } from './log_stream';
import { decorateWithKibanaContext } from './log_stream.story_decorators';

const startTimestamp = 1595145600000;
const endTimestamp = startTimestamp + 15 * 60 * 1000;

export default {
  title: 'infra/LogStream',
  component: LogStream,
  decorators: [
    (wrappedStory) => <I18nProvider>{wrappedStory()}</I18nProvider>,
    decorateWithKibanaContext,
    decorateWithGlobalStorybookThemeProviders,
  ],
  parameters: {
    layout: 'padded',
  },
  args: {
    startTimestamp,
    endTimestamp,
  },
} as Meta;

const LogStreamStoryTemplate: Story<LogStreamProps> = (args) => <LogStream {...args} />;

export const BasicDateRange = LogStreamStoryTemplate.bind({});

export const CenteredOnLogEntry = LogStreamStoryTemplate.bind({});
CenteredOnLogEntry.args = {
  center: { time: 1595146275000, tiebreaker: 150 },
};

export const HighlightedLogEntry = LogStreamStoryTemplate.bind({});
HighlightedLogEntry.args = {
  highlight: 'entry-197',
};

export const CustomColumns = LogStreamStoryTemplate.bind({});
CustomColumns.args = {
  columns: [
    { type: 'timestamp' },
    { type: 'field', field: 'log.level' },
    { type: 'field', field: 'host.name' },
    { type: 'message' },
  ],
};

export const CustomColumnRendering = LogStreamStoryTemplate.bind({});
CustomColumnRendering.args = {
  columns: [
    { type: 'timestamp', header: 'When?' },
    {
      type: 'field',
      field: 'log.level',
      header: false,
      width: 24,
      render: (value) => {
        switch (value) {
          case 'debug':
            return '🐞';
          case 'info':
            return 'ℹ️';
          case 'warn':
            return '⚠️';
          case 'error':
            return '❌';
        }
      },
    },
    { type: 'message' },
  ],
};
