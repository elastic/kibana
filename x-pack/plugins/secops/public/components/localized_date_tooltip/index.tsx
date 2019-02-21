/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiFlexGroup, EuiFlexItem, EuiToolTip } from '@elastic/eui';
import { FormattedRelative } from '@kbn/i18n/react';
import moment from 'moment';
import * as React from 'react';
import { pure } from 'recompose';

export const LocalizedDateTooltip = pure<{ children: React.ReactNode; date: Date }>(
  ({ children, date }) => (
    <EuiToolTip
      data-test-subj="localized-date-tool-tip"
      content={
        <EuiFlexGroup data-test-subj="dates-container" direction="column" gutterSize="none">
          <EuiFlexItem grow={false}>
            <FormattedRelative data-test-subj="humanized-relative-date" value={date} />
          </EuiFlexItem>
          <EuiFlexItem data-test-subj="with-day-of-week" grow={false}>
            {moment(date)
              .local()
              .format('llll')}
          </EuiFlexItem>
          <EuiFlexItem data-test-subj="with-time-zone-offset-in-hours" grow={false}>
            {moment(date).format()}
          </EuiFlexItem>
        </EuiFlexGroup>
      }
    >
      <>{children}</>
    </EuiToolTip>
  )
);
