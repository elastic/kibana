/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useMemo } from 'react';
import { EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import styled from 'styled-components';

import { BrowserFields } from '../../../../common/containers/source';
import { getCategorizedFieldNames } from '../../../../timelines/components/edit_data_provider/helpers';
import { FieldHook, Field } from '../../../../shared_imports';
import { THRESHOLD_FIELD_PLACEHOLDER } from './translations';

const FIELD_COMBO_BOX_WIDTH = 410;

export interface FieldValueThreshold {
  field: string[];
  value: string;
}

interface ThresholdInputProps {
  thresholdField: FieldHook;
  thresholdValue: FieldHook;
  browserFields: BrowserFields;
}

const OperatorWrapper = styled(EuiFlexItem)`
  align-self: center;
`;

const fieldDescribedByIds = ['detectionEngineStepDefineRuleThresholdField'];
const valueDescribedByIds = ['detectionEngineStepDefineRuleThresholdValue'];

const ThresholdInputComponent: React.FC<ThresholdInputProps> = ({
  thresholdField,
  thresholdValue,
  browserFields,
}: ThresholdInputProps) => {
  const fieldEuiFieldProps = useMemo(
    () => ({
      fullWidth: true,
      singleSelection: { asPlainText: true },
      noSuggestions: false,
      options: getCategorizedFieldNames(browserFields),
      placeholder: THRESHOLD_FIELD_PLACEHOLDER,
      onCreateOption: undefined,
      style: { width: `${FIELD_COMBO_BOX_WIDTH}px` },
    }),
    [browserFields]
  );

  return (
    <EuiFlexGroup>
      <EuiFlexItem grow={false}>
        <Field
          field={thresholdField}
          idAria="detectionEngineStepDefineRuleThresholdField"
          data-test-subj="detectionEngineStepDefineRuleThresholdField"
          describedByIds={fieldDescribedByIds}
          type={thresholdField.type}
          euiFieldProps={fieldEuiFieldProps}
        />
      </EuiFlexItem>
      <OperatorWrapper grow={false}>{'>='}</OperatorWrapper>
      <EuiFlexItem grow={false}>
        <Field
          field={thresholdValue}
          idAria="detectionEngineStepDefineRuleThresholdValue"
          data-test-subj="detectionEngineStepDefineRuleThresholdValue"
          describedByIds={valueDescribedByIds}
          type={thresholdValue.type}
        />
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};

export const ThresholdInput = React.memo(ThresholdInputComponent);
