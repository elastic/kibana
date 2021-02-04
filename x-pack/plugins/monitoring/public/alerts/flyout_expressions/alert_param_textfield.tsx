/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useState } from 'react';
import { EuiFormRow, EuiFieldText } from '@elastic/eui';

interface Props {
  name: string;
  value: string;
  placeholder?: string;
  label: string;
  errors: string[];
  setAlertParams: (property: string, value: string) => void;
}
export const AlertParamTextField: React.FC<Props> = (props: Props) => {
  const { name, label, setAlertParams, errors, placeholder } = props;
  const [value, setValue] = useState(props.value);
  return (
    <EuiFormRow label={label} error={errors} isInvalid={errors?.length > 0}>
      <EuiFieldText
        compressed
        placeholder={placeholder}
        value={value}
        onChange={(e) => {
          const newValue = e.target.value;
          setValue(newValue);
          setAlertParams(name, newValue);
        }}
      />
    </EuiFormRow>
  );
};
