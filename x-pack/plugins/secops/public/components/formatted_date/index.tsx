/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import moment from 'moment-timezone';
import * as React from 'react';
import { pure } from 'recompose';

import { AppKibanaFrameworkAdapter } from '../../lib/adapters/framework/kibana_framework_adapter';

export const KibanaConfigContext = React.createContext<Partial<AppKibanaFrameworkAdapter>>({});

export const PreferenceFormattedDate = pure<{ value: Date }>(({ value }) => (
  <KibanaConfigContext.Consumer>
    {(config: Partial<AppKibanaFrameworkAdapter>) => {
      return config && config.dateFormat && config.dateFormatTz && config.timezone
        ? moment
            .tz(value, config.dateFormatTz === 'Browser' ? config.timezone : config.dateFormatTz)
            .format(config.dateFormat)
        : moment.utc(value).toISOString();
    }}
  </KibanaConfigContext.Consumer>
));
