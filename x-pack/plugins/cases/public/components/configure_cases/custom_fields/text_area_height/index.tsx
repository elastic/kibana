/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import type { EuiRangeProps } from '@elastic/eui';
import { EuiRange } from '@elastic/eui';

interface Props {
  disabled: boolean;
  isLoading: boolean;
  onChange: (newValue: string) => void;
}

const MIN_TEXT_AREA_HEIGHT = 2;
const MAX_TEXT_AREA_HEIGHT = 7;

export const TextAreaHeightComponent = ({ disabled, isLoading, onChange }: Props) => {
  const [value, setValue] = useState<EuiRangeProps['value']>('2');

  const handleOnChange: EuiRangeProps['onChange'] = (e) => {
    setValue(e.currentTarget.value);
    onChange(e.currentTarget.value);
  };

  return (
    <EuiRange
      disabled={disabled}
      isLoading={isLoading}
      value={value}
      onChange={handleOnChange}
      min={MIN_TEXT_AREA_HEIGHT}
      max={MAX_TEXT_AREA_HEIGHT}
      showInput
      showRange
      showTicks
      append={'Lines'}
      valuePrepend
      fullWidth
      tickInterval={1}
    />
  );
};

TextAreaHeightComponent.displayName = 'TextAreaHeight';

export const TextAreaHeight = React.memo(TextAreaHeightComponent);
