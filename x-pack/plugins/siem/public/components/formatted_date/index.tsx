/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import moment from 'moment-timezone';
import * as React from 'react';
import { pure } from 'recompose';

import { AppKibanaFrameworkAdapter } from '../../lib/adapters/framework/kibana_framework_adapter';
import { getOrEmptyTagFromValue } from '../empty_value';
import { LocalizedDateTooltip } from '../localized_date_tooltip';

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

/**
 * Renders the specified date value in a format determined by the user's preferences,
 * with a tooltip that renders:
 * - the name of the field
 * - a humanized relative date (e.g. 16 minutes ago)
 * - a long representation of the date that includes the day of the week (e.g. Thursday, March 21, 2019 6:47pm)
 * - the raw date value (e.g. 2019-03-22T00:47:46Z)
 */
export const FormattedDate = pure<{
  fieldName: string;
  value?: string | number | null;
}>(({ value, fieldName }) => {
  if (value == null) {
    return getOrEmptyTagFromValue(value);
  }

  const maybeDate = moment(new Date(value));

  return maybeDate.isValid() ? (
    <LocalizedDateTooltip date={maybeDate.toDate()} fieldName={fieldName}>
      <PreferenceFormattedDate value={new Date(value)} />
    </LocalizedDateTooltip>
  ) : (
    getOrEmptyTagFromValue(value)
  );
});
