/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo } from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiIcon, EuiText } from '@elastic/eui';
import { CREATED, LAST_UPDATED } from './translations';
import {
  FormattedRelativePreferenceDate,
  FormattedRelativePreferenceDateProps,
} from '../../../../common/components/formatted_date';
import { TextValueDisplay } from './text_value_display';

export interface DateFieldProps {
  date: FormattedRelativePreferenceDateProps['value'];
  type: 'update' | 'create';
}

export const DateFieldValue = memo<DateFieldProps>(({ date, type }) => {
  return (
    <EuiFlexGroup responsive={false} gutterSize="m">
      <EuiFlexItem grow={false}>
        <EuiIcon type="calendar" />
      </EuiFlexItem>
      <EuiFlexItem grow={true}>
        <EuiFlexGroup responsive={false} direction="column" alignItems="flexStart" gutterSize="xs">
          <EuiFlexItem className="eui-textTruncate">
            <TextValueDisplay>{type === 'update' ? LAST_UPDATED : CREATED}</TextValueDisplay>
          </EuiFlexItem>
          <EuiFlexItem className="eui-textTruncate">
            <TextValueDisplay bold>
              <FormattedRelativePreferenceDate value={date} dateFormat="M/D/YYYY" />
            </TextValueDisplay>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
});
DateFieldValue.displayName = 'DateField';
