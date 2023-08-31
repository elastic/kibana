/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback } from 'react';
import { EuiFormRow } from '@elastic/eui';
import type { FieldHook } from '@kbn/es-ui-shared-plugin/static/forms/hook_form_lib';
import { getFieldValidityAndErrorMessage } from '@kbn/es-ui-shared-plugin/static/forms/hook_form_lib';
import type { CustomFieldTypesUI } from '../types';
import { FieldOptions } from '.';

interface FieldOptionsSelectorProps {
  dataTestSubj: string;
  idAria: string;
  disabled: boolean;
  field: FieldHook<string>;
  isLoading: boolean;
  selectedType: CustomFieldTypesUI;
}

export const FieldOptionsSelector = ({
  disabled = false,
  field,
  isLoading = false,
  dataTestSubj,
  idAria,
  selectedType,
}: FieldOptionsSelectorProps) => {
  const { isInvalid, errorMessage } = getFieldValidityAndErrorMessage(field);

  const handleOptionChange = useCallback(
    (checkboxOption) => {
      field.setValue(checkboxOption);
    },
    [field]
  );

  return (
    <EuiFormRow
      data-test-subj={dataTestSubj}
      describedByIds={idAria ? [idAria] : undefined}
      error={errorMessage}
      fullWidth
      helpText={field.helpText}
      isInvalid={isInvalid}
      label={field.label}
      labelAppend={field.labelAppend}
    >
      <FieldOptions
        selectedType={selectedType}
        disabled={disabled || isLoading}
        handleOptionChange={handleOptionChange}
      />
    </EuiFormRow>
  );
};

FieldOptionsSelector.displayName = 'FieldOptionsSelector';
