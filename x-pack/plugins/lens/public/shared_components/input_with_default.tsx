/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiFieldText, EuiFieldTextProps } from '@elastic/eui';
import { useDebouncedValue } from '.';

type Props = {
  value: string;
  onChange: (value: string) => void;
  defaultValue?: string;
} & Omit<EuiFieldTextProps, 'value' | 'onChange' | 'defaultValue'>;

const DebouncedInput = ({ onChange, value, defaultValue, ...rest }: Props) => {
  const { inputValue, handleInputChange, initialValue } = useDebouncedValue({
    onChange,
    value,
    defaultValue,
  });

  return (
    <EuiFieldText
      {...rest}
      value={inputValue}
      onChange={(e) => {
        handleInputChange(e.target.value);
      }}
      placeholder={initialValue}
    />
  );
};

export const InputWithDefault = (props: Props) => (
  // need this extra layer to force a rerender whenever the default value changes.
  // this is because we need a new initialValue to be computed from the debounce hook.
  <DebouncedInput {...props} key={props.defaultValue} />
);
