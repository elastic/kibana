/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFlexGroup, EuiFlexItem, EuiToolTip } from '@elastic/eui';
import { FormattedRelative } from '@kbn/i18n-react';
import moment from 'moment';
import React from 'react';

export const LocalizedDateTooltip = React.memo<{
  children: React.ReactNode;
  date: Date;
  fieldName?: string;
  className?: string;
}>(({ children, date, fieldName, className = '' }) => (
  <EuiToolTip
    data-test-subj="localized-date-tool-tip"
    anchorClassName={className}
    content={
      <EuiFlexGroup data-test-subj="dates-container" direction="column" gutterSize="none">
        {fieldName != null ? (
          <EuiFlexItem grow={false}>
            <span data-test-subj="field-name">{fieldName}</span>
          </EuiFlexItem>
        ) : null}
        <EuiFlexItem grow={false}>
          <FormattedRelative
            data-test-subj="humanized-relative-date"
            value={moment.utc(date).toDate()}
          />
        </EuiFlexItem>
        <EuiFlexItem data-test-subj="with-day-of-week" grow={false}>
          {moment.utc(date).local().format('llll')}
        </EuiFlexItem>
        <EuiFlexItem data-test-subj="with-time-zone-offset-in-hours" grow={false}>
          {moment(date).format()}
        </EuiFlexItem>
      </EuiFlexGroup>
    }
  >
    <>{children}</>
  </EuiToolTip>
));

LocalizedDateTooltip.displayName = 'LocalizedDateTooltip';
