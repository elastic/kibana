/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';

import { EuiToolTip } from '@elastic/eui';
import type { DataViewFieldBase } from '@kbn/es-query';
import type { FieldHook } from '../../../../shared_imports';
import { Field } from '../../../../shared_imports';
import { FIELD_PLACEHOLDER } from './translations';

interface MultiSelectAutocompleteProps {
  browserFields: DataViewFieldBase[];
  isDisabled: boolean;
  field: FieldHook;
  fullWidth?: boolean;
  disabledText?: string;
  dataTestSubj?: string;
}

const FIELD_COMBO_BOX_WIDTH = 410;

const fieldDescribedByIds = 'detectionEngineMultiSelectAutocompleteField';

export const MultiSelectAutocompleteComponent: React.FC<MultiSelectAutocompleteProps> = ({
  browserFields,
  disabledText,
  isDisabled,
  field,
  fullWidth = false,
  dataTestSubj,
}: MultiSelectAutocompleteProps) => {
  const fieldEuiFieldProps = useMemo(
    () => ({
      fullWidth: true,
      noSuggestions: false,
      options: browserFields.map((browserField) => ({ label: browserField.name })),
      placeholder: FIELD_PLACEHOLDER,
      onCreateOption: undefined,
      ...(fullWidth ? {} : { style: { width: `${FIELD_COMBO_BOX_WIDTH}px` } }),
      isDisabled,
    }),
    [browserFields, isDisabled, fullWidth]
  );
  const fieldComponent = (
    <Field
      field={field}
      idAria={fieldDescribedByIds}
      euiFieldProps={fieldEuiFieldProps}
      data-test-subj={dataTestSubj}
    />
  );
  return isDisabled ? (
    <EuiToolTip position="right" content={disabledText}>
      {fieldComponent}
    </EuiToolTip>
  ) : (
    fieldComponent
  );
};

export const MultiSelectFieldsAutocomplete = React.memo(MultiSelectAutocompleteComponent);
