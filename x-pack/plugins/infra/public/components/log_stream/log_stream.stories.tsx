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
import { ENTRIES, ENTRIES_EMPTY } from '../../test_utils/entries';

const startTimestamp = ENTRIES.data.topCursor.time;
const endTimestamp = ENTRIES.data.bottomCursor.time;

// Mocks
const fetch = function (url, params) {
  switch (url) {
    case '/api/infra/log_source_configurations/default':
      return DEFAULT_SOURCE_CONFIGURATION;
    case '/api/log_entries/entries':
      const body = JSON.parse(params.body);
      if (body.after?.time === body.endTimestamp || body.before?.time === body.startTimestamp) {
        return ENTRIES_EMPTY;
      } else {
        return ENTRIES;
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
