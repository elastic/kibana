/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import type { DataViewFieldBase } from '@kbn/es-query';
import { ComboBoxField } from '@kbn/es-ui-shared-plugin/static/forms/components';
import type { FieldHook } from '../../../../shared_imports';
import { FIELD_PLACEHOLDER } from './translations';

interface MultiSelectAutocompleteProps {
  browserFields: DataViewFieldBase[];
  isDisabled: boolean;
  field: FieldHook;
  fullWidth?: boolean;
  dataTestSubj?: string;
}

const FIELD_COMBO_BOX_WIDTH = 410;

const fieldDescribedByIds = 'detectionEngineMultiSelectAutocompleteField';

export const MultiSelectAutocompleteComponent: React.FC<MultiSelectAutocompleteProps> = ({
  browserFields,
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

  return (
    <ComboBoxField
      field={field}
      idAria={fieldDescribedByIds}
      euiFieldProps={fieldEuiFieldProps}
      data-test-subj={dataTestSubj}
    />
  );
};

export const MultiSelectFieldsAutocomplete = React.memo(MultiSelectAutocompleteComponent);
