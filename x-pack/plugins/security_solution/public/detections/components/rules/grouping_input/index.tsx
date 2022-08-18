/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';

import type { DataViewFieldBase } from '@kbn/es-query';
import type { FieldHook } from '../../../../shared_imports';
import { Field } from '../../../../shared_imports';

const FIELD_COMBO_BOX_WIDTH = 410;

export interface FieldValueAlertGrouping {
  groupBy: string[];
}

interface AlertGroupingInputProps {
  groupBy: FieldHook;
  browserFields: DataViewFieldBase[];
}

const groupByDescribedByIds = ['detectionEngineStepDefineRuleThresholdFieldGroupBy'];

const AlertGroupingInputComponent: React.FC<AlertGroupingInputProps> = ({
  groupBy,
  browserFields,
}: AlertGroupingInputProps) => {
  const groupByEuiFieldProps = useMemo(
    () => ({
      fullWidth: true,
      noSuggestions: false,
      options: browserFields.map((field) => ({ label: field.name })),
      placeholder: [],
      onCreateOption: undefined,
      style: { width: `${FIELD_COMBO_BOX_WIDTH}px` },
    }),
    [browserFields]
  );

  return (
    <Field
      field={groupBy}
      idAria={groupByDescribedByIds[0]}
      data-test-subj={groupByDescribedByIds[0]}
      describedByIds={groupByDescribedByIds}
      type={groupBy.type}
      euiFieldProps={groupByEuiFieldProps}
    />
  );
};

export const AlertGroupingInput = React.memo(AlertGroupingInputComponent);
