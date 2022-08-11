/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { createKibanaReactContext } from '@kbn/kibana-react-plugin/public';
import { CoreStart } from '@kbn/core/public';
import { DEFAULT_DATE_FORMAT, DEFAULT_DATE_FORMAT_TZ } from '../../../common/constants';
import { DateFormatter } from './date_formatter';

const mockValidStringDate = '1 Jan 2022 00:00:00 GMT';
const mockInvalidStringDate = 'invalid date';
const mockDateFormat = 'dddd';

export default {
  component: DateFormatter,
  title: 'DateFormatter',
};

export function Default() {
  const coreMock = {
    uiSettings: {
      get: (key: string) => {
        const settings = {
          [DEFAULT_DATE_FORMAT]: '',
          [DEFAULT_DATE_FORMAT_TZ]: 'UTC',
        };
        // @ts-expect-error
        return settings[key];
      },
    },
  } as unknown as CoreStart;
  const KibanaReactContext = createKibanaReactContext(coreMock);

  return (
    <KibanaReactContext.Provider>
      <DateFormatter date={mockValidStringDate} />
    </KibanaReactContext.Provider>
  );
}

export function UserTimeZone() {
  const coreMock = {
    uiSettings: {
      get: (key: string) => {
        const settings = {
          [DEFAULT_DATE_FORMAT]: '',
          [DEFAULT_DATE_FORMAT_TZ]: 'America/New_York',
        };
        // @ts-expect-error
        return settings[key];
      },
    },
  } as unknown as CoreStart;
  const KibanaReactContext = createKibanaReactContext(coreMock);

  return (
    <KibanaReactContext.Provider>
      <DateFormatter date={mockValidStringDate} />
    </KibanaReactContext.Provider>
  );
}

export function UserDateFormat() {
  const coreMock = {
    uiSettings: {
      get: (key: string) => {
        const settings = {
          [DEFAULT_DATE_FORMAT]: 'MMM Do YY',
          [DEFAULT_DATE_FORMAT_TZ]: 'UTC',
        };
        // @ts-expect-error
        return settings[key];
      },
    },
  } as unknown as CoreStart;
  const KibanaReactContext = createKibanaReactContext(coreMock);

  return (
    <KibanaReactContext.Provider>
      <DateFormatter date={mockValidStringDate} />
    </KibanaReactContext.Provider>
  );
}

export function CustomDateFormat() {
  const coreMock = {
    uiSettings: {
      get: (key: string) => {
        const settings = {
          [DEFAULT_DATE_FORMAT_TZ]: 'UTC',
        };
        // @ts-expect-error
        return settings[key];
      },
    },
  } as unknown as CoreStart;
  const KibanaReactContext = createKibanaReactContext(coreMock);

  return (
    <KibanaReactContext.Provider>
      <DateFormatter date={mockValidStringDate} dateFormat={mockDateFormat} />
    </KibanaReactContext.Provider>
  );
}

export function InvalidStringDate() {
  const coreMock = {
    uiSettings: {
      get: (key: string) => {
        const settings = {
          [DEFAULT_DATE_FORMAT]: '',
          [DEFAULT_DATE_FORMAT_TZ]: 'UTC',
        };
        // @ts-expect-error
        return settings[key];
      },
    },
  } as unknown as CoreStart;
  const KibanaReactContext = createKibanaReactContext(coreMock);

  return (
    <KibanaReactContext.Provider>
      <DateFormatter date={mockInvalidStringDate} />
    </KibanaReactContext.Provider>
  );
}
