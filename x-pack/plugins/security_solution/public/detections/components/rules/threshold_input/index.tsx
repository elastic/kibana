/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useCallback } from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiRange, EuiFormRow } from '@elastic/eui';

import { FieldHook, getUseField, Field } from '../../../../shared_imports';

interface ThresholdInputProps {
  field: FieldHook;
}
// type Event = React.ChangeEvent<HTMLInputElement>;
// type EventArg = Event | React.MouseEvent<HTMLButtonElement>;

const CommonUseField = getUseField({ component: Field });

export const ThresholdInput = ({ field }: ThresholdInputProps) => {
  // const threshold = field.value as number;
  // const onThresholdChange = useCallback(
  //   (event: EventArg) => {
  //     const thresholdValue = Number((event as Event).target.value);
  //     field.setValue(thresholdValue);
  //   },
  //   [field]
  // );

  return (
    <EuiFormRow label={field.label} data-test-subj="thresholdInput">
      <EuiFlexGroup>
        <EuiFlexItem>
          <CommonUseField
            path="threshold.field"
            componentProps={{
              idAria: 'detectionEngineStepAboutRuleName',
              'data-test-subj': 'detectionEngineStepAboutRuleName',
              euiFieldProps: {
                fullWidth: true,
                // disabled: isLoading,
              },
            }}
          />
        </EuiFlexItem>
        <EuiFlexItem>{'>='}</EuiFlexItem>
        <EuiFlexItem>
          <CommonUseField
            path="threshold.value"
            componentProps={{
              idAria: 'detectionEngineStepAboutRuleName',
              'data-test-subj': 'detectionEngineStepAboutRuleName',
              euiFieldProps: {
                fullWidth: true,
                // disabled: isLoading,
              },
            }}
          />
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiFormRow>
  );
};
