/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import { EuiFlexGroup, EuiFlexItem } from '@elastic/eui';

import type { DataViewFieldBase } from '@kbn/es-query';
import type { FieldHook } from '../../../../shared_imports';
import { Field } from '../../../../shared_imports';
import { ResponsiveGroup, Operator } from './layout';
import { THRESHOLD_FIELD_PLACEHOLDER } from './translations';

const FIELD_COMBO_BOX_WIDTH = 410;

export interface FieldValueThreshold {
  field: string[];
  value: string;
  cardinality?: {
    field: string[];
    value: string;
  };
}

interface ThresholdInputProps {
  thresholdField: FieldHook;
  thresholdValue: FieldHook;
  thresholdCardinalityField: FieldHook;
  thresholdCardinalityValue: FieldHook;
  browserFields: DataViewFieldBase[];
  direction?: 'row' | 'column';
}

const fieldDescribedByIds = ['detectionEngineStepDefineRuleThresholdField'];
const valueDescribedByIds = ['detectionEngineStepDefineRuleThresholdValue'];
const cardinalityFieldDescribedByIds = ['detectionEngineStepDefineRuleThresholdCardinalityField'];
const cardinalityValueDescribedByIds = ['detectionEngineStepDefineRuleThresholdCardinalityValue'];

const ThresholdInputComponent: React.FC<ThresholdInputProps> = ({
  thresholdField,
  thresholdValue,
  browserFields,
  thresholdCardinalityField,
  thresholdCardinalityValue,
  direction = 'row',
}: ThresholdInputProps) => {
  const fieldEuiFieldProps = useMemo(
    () => ({
      fullWidth: true,
      noSuggestions: false,
      options: browserFields.map((field) => ({ label: field.name })),
      placeholder: THRESHOLD_FIELD_PLACEHOLDER,
      onCreateOption: undefined,
      style: direction === 'row' ? { width: `${FIELD_COMBO_BOX_WIDTH}px` } : {},
    }),
    [browserFields, direction]
  );
  const cardinalityFieldEuiProps = useMemo(
    () => ({
      fullWidth: true,
      noSuggestions: false,
      options: browserFields.map((field) => ({ label: field.name })),
      placeholder: THRESHOLD_FIELD_PLACEHOLDER,
      onCreateOption: undefined,
      style: direction === 'row' ? { width: `${FIELD_COMBO_BOX_WIDTH}px` } : {},
      singleSelection: { asPlainText: true },
    }),
    [browserFields, direction]
  );

  return (
    <EuiFlexGroup direction="column" style={{ marginLeft: 0 }}>
      <ResponsiveGroup direction={direction}>
        <EuiFlexItem grow={false}>
          <Field
            field={thresholdField}
            idAria={fieldDescribedByIds[0]}
            data-test-subj={fieldDescribedByIds[0]}
            describedByIds={fieldDescribedByIds}
            type={thresholdField.type}
            euiFieldProps={fieldEuiFieldProps}
          />
        </EuiFlexItem>
        <Operator />
        <EuiFlexItem grow={false}>
          <Field
            field={thresholdValue}
            idAria={valueDescribedByIds[0]}
            data-test-subj={valueDescribedByIds[0]}
            describedByIds={valueDescribedByIds}
            type={thresholdValue.type}
          />
        </EuiFlexItem>
      </ResponsiveGroup>
      <ResponsiveGroup direction={direction}>
        <EuiFlexItem grow={false}>
          <Field
            field={thresholdCardinalityField}
            idAria={cardinalityFieldDescribedByIds[0]}
            data-test-subj={cardinalityFieldDescribedByIds[0]}
            describedByIds={cardinalityFieldDescribedByIds}
            type={thresholdCardinalityField.type}
            euiFieldProps={cardinalityFieldEuiProps}
          />
        </EuiFlexItem>
        <Operator />
        <EuiFlexItem grow={false}>
          <Field
            field={thresholdCardinalityValue}
            idAria={cardinalityValueDescribedByIds[0]}
            data-test-subj={cardinalityValueDescribedByIds[0]}
            describedByIds={cardinalityValueDescribedByIds}
            type={thresholdCardinalityValue.type}
          />
        </EuiFlexItem>
      </ResponsiveGroup>
    </EuiFlexGroup>
  );
};

export const ThresholdInput = React.memo(ThresholdInputComponent);
