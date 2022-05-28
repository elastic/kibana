/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { FC } from 'react';
import { i18n } from '@kbn/i18n';
import {
  EuiFieldNumber,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFormRow,
  EuiRange,
  EuiRangeProps,
} from '@elastic/eui';
import { ANOMALY_THRESHOLD } from '../../../../common';

export interface SeveritySelectorProps {
  value: number | undefined;
  onChange: (value: number) => void;
}

const MAX_ANOMALY_SCORE = 100;

export const SeverityControl: FC<SeveritySelectorProps> = React.memo(({ value, onChange }) => {
  const levels: EuiRangeProps['levels'] = [
    {
      min: ANOMALY_THRESHOLD.LOW,
      max: ANOMALY_THRESHOLD.MINOR,
      color: '#8BC8FB',
    },
    {
      min: ANOMALY_THRESHOLD.MINOR,
      max: ANOMALY_THRESHOLD.MAJOR,
      color: '#FDEC25',
    },
    {
      min: ANOMALY_THRESHOLD.MAJOR,
      max: ANOMALY_THRESHOLD.CRITICAL,
      color: '#FBA740',
    },
    {
      min: ANOMALY_THRESHOLD.CRITICAL,
      max: MAX_ANOMALY_SCORE,
      color: '#FE5050',
    },
  ];

  const label = i18n.translate('xpack.ml.severitySelector.formControlLabel', {
    defaultMessage: 'Severity',
  });

  const resultValue = value ?? ANOMALY_THRESHOLD.LOW;

  const onChangeCallback = (
    e: React.ChangeEvent<HTMLInputElement> | React.MouseEvent<HTMLButtonElement>
  ) => {
    // @ts-ignore Property 'value' does not exist on type 'EventTarget' | (EventTarget & HTMLInputElement)
    onChange(Number(e.target.value));
  };

  const ticks = new Array(5).fill(null).map((x, i) => {
    const v = i * 25;
    return { value: v, label: v };
  });

  return (
    <EuiFormRow fullWidth>
      <EuiFlexGroup>
        <EuiFlexItem grow={false}>
          <EuiFieldNumber
            id="severityControl"
            style={{ width: '70px' }}
            compressed
            prepend={label}
            value={resultValue}
            onChange={onChangeCallback}
            min={ANOMALY_THRESHOLD.LOW}
            max={MAX_ANOMALY_SCORE}
          />
        </EuiFlexItem>
        <EuiFlexItem grow={true}>
          <EuiRange
            className={'mlSeverityControl'}
            fullWidth
            min={ANOMALY_THRESHOLD.LOW}
            max={MAX_ANOMALY_SCORE}
            value={resultValue}
            onChange={onChangeCallback}
            aria-label={i18n.translate('xpack.ml.severitySelector.formControlAriaLabel', {
              defaultMessage: 'Select severity threshold',
            })}
            showTicks
            ticks={ticks}
            showRange={false}
            levels={levels}
            data-test-subj={'mlAnomalyAlertScoreSelection'}
          />
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiFormRow>
  );
});
