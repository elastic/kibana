/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo } from 'react';
import { EuiFormRow } from '@elastic/eui';
import { EsFieldSelector } from '@kbn/securitysolution-autocomplete';
import type { DataViewBase, DataViewFieldBase } from '@kbn/es-query';
import type { FieldHook } from '@kbn/es-ui-shared-plugin/static/forms/hook_form_lib';

interface EsFieldSelectorFieldProps {
  dataTestSubj: string;
  field: FieldHook<string>;
  idAria: string;
  indices: DataViewBase;
  isDisabled: boolean;
  fieldType: string;
  placeholder?: string;
}

export const EsFieldSelectorField = ({
  dataTestSubj,
  field,
  idAria,
  indices,
  isDisabled,
  fieldType,
  placeholder,
}: EsFieldSelectorFieldProps) => {
  const fieldTypeFilter = useMemo(() => [fieldType], [fieldType]);

  const handleFieldChange = useCallback(
    ([newField]: DataViewFieldBase[]): void => {
      field.setValue(newField?.name ?? '');
    },
    [field]
  );

  const selectedField = useMemo(
    () =>
      indices.fields.find(({ name }) => field.value === name) ?? {
        name: field.value,
        type: fieldType,
      },
    [field.value, indices, fieldType]
  );

  const describedByIds = useMemo(() => (idAria ? [idAria] : undefined), [idAria]);

  return (
    <EuiFormRow
      data-test-subj={dataTestSubj}
      describedByIds={describedByIds}
      fullWidth
      helpText={field.helpText}
      label={field.label}
      labelAppend={field.labelAppend}
    >
      <EsFieldSelector
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
