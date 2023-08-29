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
import { TextAreaHeight } from '.';

interface TextAreaHeightSelectorProps {
  dataTestSubj: string;
  disabled: boolean;
  field: FieldHook<string>;
  idAria: string;
  isLoading: boolean;
  // handleTextAreaHeightChange: (newValue: string) => void;
}

export const TextAreaHeightSelector = ({
  dataTestSubj,
  disabled = false,
  field,
  idAria,
  isLoading = false,
}: // handleTextAreaHeightChange,
TextAreaHeightSelectorProps) => {
  const { isInvalid, errorMessage } = getFieldValidityAndErrorMessage(field);
  const onChange = useCallback(
    (val: string) => {
      field.setValue(val);
      // handleChange(val);
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
      <TextAreaHeight disabled={disabled} isLoading={isLoading} onChange={onChange} />
    </EuiFormRow>
  );
};

TextAreaHeightSelector.displayName = 'TextAreaHeightSelector';
