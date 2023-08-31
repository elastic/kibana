/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiFormRow } from '@elastic/eui';
import type { FieldHook } from '@kbn/es-ui-shared-plugin/static/forms/hook_form_lib';
import { getFieldValidityAndErrorMessage } from '@kbn/es-ui-shared-plugin/static/forms/hook_form_lib';
import { TextAreaHeight } from './text_area_height';
import type { CustomFieldBuilder } from './types';
import { createCommonCustomFieldBuilder } from './common';

interface TextAreaHeightSelectorProps {
  dataTestSubj: string;
  disabled: boolean;
  field: FieldHook<string>;
  idAria: string;
  isLoading: boolean;
}

const TextAreaHeightSelector = ({
  dataTestSubj,
  disabled = false,
  field,
  idAria,
  isLoading = false,
}: TextAreaHeightSelectorProps) => {
  const { isInvalid, errorMessage } = getFieldValidityAndErrorMessage(field);
  const onChange = (val: string) => {
    field.setValue(val);
  };

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

export const createTextAreaCustomFieldBuilder: CustomFieldBuilder = ({ customFieldType }) => ({
  build: () => {
    const commonBuilder = createCommonCustomFieldBuilder({
      customFieldType,
      component: TextAreaHeightSelector,
      componentProps: {
        dataTestSubj: 'textAreaHeight',
        idAria: 'textAreaHeight',
        euiFieldProps: { defaultValue: '2' },
      },
    });

    return commonBuilder.build();
  },
});
