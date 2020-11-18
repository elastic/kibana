/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useCallback, useMemo, useEffect } from 'react';
import { BrowserField, BrowserFields } from '../../../../common/containers/source';
import { FieldHook } from '../../../../../../../../src/plugins/es_ui_shared/static/forms/hook_form_lib';
import { FieldComponent } from '../../../../common/components/autocomplete/field';

interface AutocompleteFieldProps {
  dataTestSubj: string;
  field: FieldHook;
  idAria: string;
  browserFields: BrowserFields;
  isDisabled: boolean;
  showOptional: boolean;
  placeholder?: string;
  filterCallback: (arg: Partial<BrowserField>) => boolean;
}

export const AutocompleteField = ({
  dataTestSubj,
  field,
  idAria,
  browserFields,
  isDisabled,
  showOptional,
  filterCallback,
  placeholder,
}: AutocompleteFieldProps) => {
  const { setErrors, validate } = field;

  useEffect(() => {
    validate();
  }, [validate]);

  const handleErrors = useCallback(
    (error: string | null): void => {
      const errors = error == null ? [] : [{ message: error }];
      setErrors(errors);
    },
    [setErrors]
  );

  const handleFieldChange = useCallback(
    (newField: string | undefined): void => {
      field.setValue(newField ?? '');
    },
    [field]
  );

  const selectedField = useMemo((): string => (field.value as string) ?? '', [field.value]);

  return (
    <FieldComponent
      placeholder={placeholder ?? ''}
      browserFields={browserFields}
      selectedField={selectedField}
      filterCallback={filterCallback}
      isLoading={false}
      isDisabled={isDisabled}
      isClearable={false}
      onError={handleErrors}
      onChange={handleFieldChange}
      data-test-subj={dataTestSubj}
      aria-label={idAria}
      fieldInputWidth={500}
      dataTestSubj={dataTestSubj}
      idAria={idAria}
      rowLabel={field.label}
      rowHelpText={field.helpText}
      showOptional={showOptional}
    />
  );
};
