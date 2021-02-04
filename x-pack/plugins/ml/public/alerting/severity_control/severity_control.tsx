/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { FC } from 'react';
import { FormattedMessage } from '@kbn/i18n/react';
import { EuiFormRow, EuiRange, EuiRangeProps } from '@elastic/eui';
import { SEVERITY_OPTIONS } from '../../application/components/controls/select_severity/select_severity';
import { ANOMALY_THRESHOLD } from '../../../common';
import './styles.scss';

export interface SeveritySelectorProps {
  value: number | undefined;
  onChange: (value: number) => void;
}

const MAX_ANOMALY_SCORE = 100;

export const SeverityControl: FC<SeveritySelectorProps> = React.memo(({ value, onChange }) => {
  const levels: EuiRangeProps['levels'] = [
    {
      min: ANOMALY_THRESHOLD.LOW,
      max: ANOMALY_THRESHOLD.MINOR - 1,
      color: 'success',
    },
    {
      min: ANOMALY_THRESHOLD.MINOR,
      max: ANOMALY_THRESHOLD.MAJOR - 1,
      color: 'primary',
    },
    {
      min: ANOMALY_THRESHOLD.MAJOR,
      max: ANOMALY_THRESHOLD.CRITICAL,
      color: 'warning',
    },
    {
      min: ANOMALY_THRESHOLD.CRITICAL,
      max: MAX_ANOMALY_SCORE,
      color: 'danger',
    },
  ];

  const toggleButtons = SEVERITY_OPTIONS.map((v) => ({
    value: v.val,
    label: v.display,
  }));

  return (
    <EuiFormRow
      fullWidth
      label={
        <FormattedMessage
          id="xpack.ml.severitySelector.formControlLabel"
          defaultMessage="Select severity threshold"
        />
      }
    >
      <>
        <EuiRange
          className={'mlSeverityControl'}
          fullWidth
          min={ANOMALY_THRESHOLD.LOW}
          max={MAX_ANOMALY_SCORE}
          value={value ?? ANOMALY_THRESHOLD.LOW}
          onChange={(e) => {
            // @ts-ignore Property 'value' does not exist on type 'EventTarget' | (EventTarget & HTMLInputElement)
            onChange(e.target.value);
          }}
          showLabels
          showValue
          aria-label="An example of EuiRange with showValue prop"
          showTicks
          ticks={toggleButtons}
          levels={levels}
        />
      </>
    </EuiFormRow>
  );
});
