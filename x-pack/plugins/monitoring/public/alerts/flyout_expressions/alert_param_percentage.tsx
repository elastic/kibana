/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiFormRow, EuiFieldNumber, EuiText } from '@elastic/eui';

interface Props {
  name: string;
  percentage: number;
  label: string;
  errors: string[];
  setRuleParams: (property: string, value: any) => void;
}
export const AlertParamPercentage: React.FC<Props> = (props: Props) => {
  const { name, label, setRuleParams, errors } = props;
  const [value, setValue] = React.useState(props.percentage);

  return (
    <EuiFormRow label={label} error={errors} isInvalid={errors.length > 0}>
      <EuiFieldNumber
        compressed
        value={value}
        append={
          <EuiText size="xs">
            <strong>%</strong>
          </EuiText>
        }
        onChange={(e) => {
          let newValue = parseInt(e.target.value, 10);
          if (isNaN(newValue)) {
            newValue = 0;
          }
          setValue(newValue);
          setRuleParams(name, newValue);
        }}
      />
    </EuiFormRow>
  );
};
