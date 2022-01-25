/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiToolTip, EuiText, useEuiTheme } from '@elastic/eui';
import { FormattedRelative } from '@kbn/i18n-react';
import moment from 'moment';
import React from 'react';

export const LocalizedDateTooltip = React.memo<{
  children: React.ReactNode;
  date: Date;
  fieldName?: string;
  className?: string;
}>(({ children, date, fieldName, className = '' }) => {
  const { euiTheme } = useEuiTheme();
  return (
    <EuiToolTip
      data-test-subj="localized-date-tool-tip"
      anchorClassName={className}
      content={
        <EuiText data-test-subj="dates-container" size="s">
          {fieldName != null ? <p data-test-subj="field-name">{fieldName}</p> : null}
          <strong>
            <FormattedRelative
              data-test-subj="humanized-relative-date"
              value={moment.utc(date).toDate()}
            />
          </strong>
          <ul>
            <li data-test-subj="with-day-of-week">{moment.utc(date).local().format('llll')}</li>
            <li data-test-subj="with-time-zone-offset-in-hours">{moment(date).format()}</li>
          </ul>
        </EuiText>
      }
    >
      <span
        style={{
          textDecorationLine: 'underline',
          textDecorationStyle: 'dotted',
          textDecorationColor: euiTheme.colors.mediumShade,
        }}
      >
        {children}
      </span>
    </EuiToolTip>
  );
});

LocalizedDateTooltip.displayName = 'LocalizedDateTooltip';
