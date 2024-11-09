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
import type { FieldHook } from '@kbn/es-ui-shared-plugin/static/forms/hook_form_lib';

interface AutocompleteFieldProps {
  dataTestSubj: string;
  field: FieldHook<string>;
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
  const fieldTypeFilter = useMemo(() => [fieldType], [fieldType]);

  const handleFieldChange = useCallback(
    ([newField]: DataViewFieldBase[]): void => {
      // TODO: Update onChange type in FieldComponent as newField can be undefined
      field.setValue(newField?.name ?? '');
    },
    [field]
  );

  const foundField = field.value && indices.fields.find(({ name }) => name === field.value);

  const { selectedField, indexPattern } = useMemo(() => {
    /* eslint-disable @typescript-eslint/no-shadow */
    /* If the field is not found in the indices, we still want to show it in the dropdown */
    const selectedField = foundField || { name: field.value, type: fieldType };
    const indexPattern = foundField
      ? indices
      : { ...indices, fields: [...indices.fields, selectedField] };

    return { selectedField, indexPattern };
    /* eslint-enable @typescript-eslint/no-shadow */
  }, [field.value, indices, foundField, fieldType]);

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
        indexPattern={indexPattern}
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
