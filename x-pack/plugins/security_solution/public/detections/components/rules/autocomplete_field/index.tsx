/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo } from 'react';
import { EuiFormRow } from '@elastic/eui';
import { FieldComponent } from '@kbn/securitysolution-autocomplete';
import type { DataViewBase, DataViewFieldBase } from '@kbn/es-query';
import { FieldHook } from '../../../../../../../../src/plugins/es_ui_shared/static/forms/hook_form_lib';

interface AutocompleteFieldProps {
  dataTestSubj: string;
  field: FieldHook;
  idAria: string;
  indices: DataViewBase;
  isDisabled: boolean;
  fieldType: string;
  placeholder?: string;
}

export const AutocompleteField = ({
  dataTestSubj,
  field,
  idAria,
  indices,
  isDisabled,
  fieldType,
  placeholder,
}: AutocompleteFieldProps) => {
  const handleFieldChange = useCallback(
    ([newField]: DataViewFieldBase[]): void => {
      // TODO: Update onChange type in FieldComponent as newField can be undefined
      field.setValue(newField?.name ?? '');
    },
    [field]
  );

  const selectedField = useMemo(() => {
    const existingField = (field.value as string) ?? '';
    const [newSelectedField] = indices.fields.filter(
      ({ name }) => existingField != null && existingField === name
    );
    return newSelectedField;
  }, [field.value, indices]);

  const fieldTypeFilter = useMemo(() => [fieldType], [fieldType]);

  return (
    <EuiFormRow
      data-test-subj={dataTestSubj}
      describedByIds={idAria ? [idAria] : undefined}
      fullWidth
      helpText={field.helpText}
      label={field.label}
      labelAppend={field.labelAppend}
    >
      <FieldComponent
        placeholder={placeholder ?? ''}
        indexPattern={indices}
        selectedField={selectedField}
        fieldTypeFilter={fieldTypeFilter}
        isLoading={false}
        isDisabled={isDisabled}
        isClearable={false}
        onChange={handleFieldChange}
        data-test-subj={dataTestSubj}
        aria-label={idAria}
        fieldInputWidth={500}
      />
    </EuiFormRow>
  );
};
