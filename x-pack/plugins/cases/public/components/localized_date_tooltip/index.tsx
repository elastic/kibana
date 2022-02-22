/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiToolTip, EuiText, useEuiTheme } from '@elastic/eui';
import moment from 'moment-timezone';
import React from 'react';
import { useTimeZone } from '../../common/lib/kibana';

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
          {fieldName != null ? (
            <p data-test-subj="field-name">
              <strong>{fieldName}</strong>
            </p>
          ) : null}
          <p>{moment.tz(date, useTimeZone()).format('llll')}</p>
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
