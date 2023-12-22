/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo } from 'react';
import { EuiFormRow, EuiFormRowProps, EuiIconTip, EuiRange, EuiRangeProps } from '@elastic/eui';

export interface RulesSettingsRangeProps {
  label: EuiFormRowProps['label'];
  labelPopoverText?: string;
  min: number;
  max: number;
  value: number;
  disabled?: EuiRangeProps['disabled'];
  onChange?: EuiRangeProps['onChange'];
}

export const RulesSettingsRange = memo((props: RulesSettingsRangeProps) => {
  const { label, labelPopoverText, min, max, value, disabled, onChange, ...rest } = props;

  const renderLabel = () => {
    return (
      <div>
        {label}
        &nbsp;
        {labelPopoverText && (
          <EuiIconTip color="subdued" size="s" type="questionInCircle" content={labelPopoverText} />
        )}
      </div>
    );
  };

  return (
    <EuiFormRow label={renderLabel()}>
      <EuiRange
        min={min}
        max={max}
        step={1}
        value={value}
        disabled={disabled}
        onChange={onChange}
        showLabels
        showValue
        {...rest}
      />
    </EuiFormRow>
  );
});
