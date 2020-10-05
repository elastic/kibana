/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React, { useState } from 'react';
import { EuiFormRow, EuiFieldNumber, EuiSwitch, EuiFlexGroup, EuiFlexItem } from '@elastic/eui';

interface ValueType {
  value: number;
  enabled: boolean;
}

interface Props {
  name: string;
  initialState: ValueType;
  label: string;
  errors: string[];
  setAlertParams: (property: string, newValue: ValueType) => void;
}
export const AlertParamNumberToggle: React.FC<Props> = (props: Props) => {
  const { name, label, initialState, setAlertParams, errors } = props;
  const [value, setValue] = useState(initialState.value);
  const [isDisabled, setDisabled] = useState(!initialState.enabled);

  const setLocalState = (newValue: number, enabled: boolean) => {
    setAlertParams(name, { value: newValue, enabled });
  };

  return (
    <EuiFormRow label={label} error={errors} isInvalid={errors?.length > 0}>
      <EuiFlexGroup justifyContent="spaceBetween" alignItems="center">
        <EuiFlexItem grow={true}>
          <EuiFieldNumber
            disabled={isDisabled}
            compressed
            value={value}
            onChange={(e) => {
              let newValue = Number(e.target.value);
              if (isNaN(newValue)) {
                newValue = 0;
              }
              setValue(newValue);
              setLocalState(newValue, !isDisabled);
            }}
          />
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiSwitch
            label={isDisabled ? 'Disabled' : 'Enabled'}
            checked={!isDisabled}
            onChange={(e) => {
              const bool = e.target.checked;
              setDisabled(!bool);
              setLocalState(value, bool);
            }}
          />
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiFormRow>
  );
};
