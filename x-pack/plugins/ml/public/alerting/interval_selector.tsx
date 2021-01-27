/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  EuiFieldNumber,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFormRow,
  EuiIconTip,
  EuiSelect,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n/react';
import React, { FC } from 'react';
import {
  getDurationNumberInItsUnit,
  getDurationUnitValue,
} from '../../../alerts/common/parse_duration';
import { getTimeOptions } from '../../../triggers_actions_ui/public';

export interface IntervalSelectorProps {
  value: string | undefined;
  onChange: (update: string) => void;
}

export const IntervalSelector: FC<IntervalSelectorProps> = React.memo(({ value, onChange }) => {
  const alertInterval = value ? getDurationNumberInItsUnit(value) : undefined;
  const alertIntervalUnit = value ? getDurationUnitValue(value) : 'm';

  const labelForAlertChecked = (
    <>
      <FormattedMessage
        id="xpack.ml.intervalSelector.formLabel"
        defaultMessage="Time range, now -"
      />{' '}
      <EuiIconTip
        position="right"
        type="questionInCircle"
        content={i18n.translate('xpack.ml.intervalSelector.checkWithTooltip', {
          defaultMessage: 'Define the relative time range for performing anomalies check.',
        })}
      />
    </>
  );

  return (
    <EuiFormRow fullWidth display="rowCompressed" label={labelForAlertChecked}>
      <EuiFlexGroup gutterSize="s">
        <EuiFlexItem>
          <EuiFieldNumber
            fullWidth
            min={1}
            value={alertInterval || ''}
            name="interval"
            data-test-subj="intervalInput"
            onChange={(e) => {
              onChange(`${e.target.value}${alertIntervalUnit}`);
            }}
          />
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiSelect
            fullWidth
            value={alertIntervalUnit}
            options={getTimeOptions(alertInterval ?? 1)}
            onChange={(e) => {
              onChange(`${alertInterval}${e.target.value}`);
            }}
          />
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiFormRow>
  );
});
