/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { Subject } from 'rxjs';
import { Meta, Story } from '@storybook/react/types-6-0';
import React from 'react';
import { I18nProvider } from '@kbn/i18n/react';

import { EuiThemeProvider } from '../../../../observability/public';
import { KibanaContextProvider } from '../../../../../../src/plugins/kibana_react/public';

import { LogStream } from './';
import { DEFAULT_SOURCE_CONFIGURATION } from '../../test_utils/source_configuration';
import { generateFakeEntries, ENTRIES_EMPTY } from '../../test_utils/entries';

const startTimestamp = Date.now() - 1000 * 60 * 15;
const endTimestamp = Date.now();

// Mocks
const fetch = function (url: string, params: any) {
  switch (url) {
    case '/api/infra/log_source_configurations/default':
      return DEFAULT_SOURCE_CONFIGURATION;
    case '/api/log_entries/entries':
      const body = JSON.parse(params.body);

      if (body.after?.time === body.endTimestamp || body.before?.time === body.startTimestamp) {
        return ENTRIES_EMPTY;
      } else {
        const entries = generateFakeEntries(
          200,
          body.startTimestamp,
          body.endTimestamp,
          body.columns || DEFAULT_SOURCE_CONFIGURATION.data.configuration.logColumns
        );

        return {
          data: {
            entries,
            topCursor: entries[0].cursor,
            bottomCursor: entries[entries.length - 1].cursor,
            hasMoreBefore: false,
          },
        };
      }

    default:
      return {};
  }
};

const uiSettings = {
  get: (setting: string) => {
    switch (setting) {
      case 'dateFormat':
        return 'MMM D, YYYY @ HH:mm:ss.SSS';
      case 'dateFormat:scaled':
        return [['', 'HH:mm:ss.SSS']];
    }
  },
  get$: () => {
    return new Subject();
  },
};

export default {
  title: 'infra/LogStream',
  component: LogStream,
  decorators: [
    (story) => (
      <I18nProvider>
        <EuiThemeProvider>
          <KibanaContextProvider services={{ http: { fetch }, uiSettings }}>
            {story()}
          </KibanaContextProvider>
        </EuiThemeProvider>
      </I18nProvider>
    ),
  ],
} as Meta;

export const Default: Story = () => {
  return <LogStream height={600} startTimestamp={startTimestamp} endTimestamp={endTimestamp} />;
};
