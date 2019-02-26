/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import moment from 'moment-timezone';
import * as React from 'react';
import { pure } from 'recompose';

import { AppFrameworkAdapter } from '../../lib/lib';

export const KibanaConfigContext = React.createContext<Partial<AppFrameworkAdapter>>({});

export const PreferenceFormattedDate = pure<{ value: Date | string }>(({ value }) => (
  <KibanaConfigContext.Consumer>
    {(config: Partial<AppFrameworkAdapter>) =>
      config && config.dateFormatTz && config.dateFormatTz
        ? moment.tz(value, config.dateFormatTz).format(config.dateFormat)
        : moment.utc(value).toISOString()
    }
  </KibanaConfigContext.Consumer>
));
