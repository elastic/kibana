/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { createKibanaReactContext } from '@kbn/kibana-react-plugin/public';
import { CoreStart } from '@kbn/core/public';
import { mockUiSettingsService } from '../../common/mocks/mock_kibana_ui_settings_service';
import { DateFormatter } from './date_formatter';

const mockValidStringDate = '1 Jan 2022 00:00:00 GMT';
const mockInvalidStringDate = 'invalid date';
const mockDateFormat = 'dddd';

export default {
  component: DateFormatter,
  title: 'DateFormatter',
};

export function Default() {
  const KibanaReactContext = createKibanaReactContext({
    uiSettings: mockUiSettingsService(),
  } as unknown as CoreStart);

  return (
    <KibanaReactContext.Provider>
      <DateFormatter date={mockValidStringDate} />
    </KibanaReactContext.Provider>
  );
}

export function UserTimeZone() {
  const KibanaReactContext = createKibanaReactContext({
    uiSettings: mockUiSettingsService('', 'America/New York'),
  });

  return (
    <KibanaReactContext.Provider>
      <DateFormatter date={mockValidStringDate} />
    </KibanaReactContext.Provider>
  );
}

export function UserDateFormat() {
  const KibanaReactContext = createKibanaReactContext({
    uiSettings: mockUiSettingsService('MMM Do YY', 'UTC'),
  });

  return (
    <KibanaReactContext.Provider>
      <DateFormatter date={mockValidStringDate} />
    </KibanaReactContext.Provider>
  );
}

export function CustomDateFormat() {
  const KibanaReactContext = createKibanaReactContext({
    uiSettings: mockUiSettingsService('', 'UTC'),
  });

  return (
    <KibanaReactContext.Provider>
      <DateFormatter date={mockValidStringDate} dateFormat={mockDateFormat} />
    </KibanaReactContext.Provider>
  );
}

export function InvalidStringDate() {
  const KibanaReactContext = createKibanaReactContext({
    uiSettings: mockUiSettingsService(),
  });

  return (
    <KibanaReactContext.Provider>
      <DateFormatter date={mockInvalidStringDate} />
    </KibanaReactContext.Provider>
  );
}
