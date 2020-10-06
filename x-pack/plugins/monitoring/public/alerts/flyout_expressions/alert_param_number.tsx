/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useState } from 'react';
import { EuiFormRow, EuiFieldNumber } from '@elastic/eui';

interface Props {
  name: string;
  value: number;
  label: string;
  errors: string[];
  setAlertParams: (property: string, value: number) => void;
}
export const AlertParamNumber: React.FC<Props> = (props: Props) => {
  const { name, label, setAlertParams, errors } = props;
  const [value, setValue] = useState(props.value);
  return (
    <EuiFormRow label={label} error={errors} isInvalid={errors?.length > 0}>
      <EuiFieldNumber
        compressed
        value={value}
        onChange={(e) => {
          let newValue = Number(e.target.value);
          if (isNaN(newValue)) {
            newValue = 0;
          }
          setValue(newValue);
          setAlertParams(name, newValue);
        }}
      />
    </EuiFormRow>
  );
};
