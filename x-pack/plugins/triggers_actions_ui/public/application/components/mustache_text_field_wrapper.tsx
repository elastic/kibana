/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  FieldHook,
  getFieldValidityAndErrorMessage,
} from '@kbn/es-ui-shared-plugin/static/forms/hook_form_lib';
import React, { useCallback } from 'react';
import { ActionVariable } from '@kbn/alerting-plugin/common';
import { TextFieldWithMessageVariables } from './text_field_with_message_variables';

interface Props {
  field: FieldHook<any, string>;
  messageVariables?: ActionVariable[];
  paramsProperty: string;
  euiFieldProps: { [key: string]: any; paramsProperty: string };
  [key: string]: any;
}

export const MustacheTextFieldWrapper = ({ field, euiFieldProps, idAria, ...rest }: Props) => {
  const { isInvalid, errorMessage } = getFieldValidityAndErrorMessage(field);

  const { value, setValue } = field;

  const editAction = useCallback(
    (property: string, newValue: string) => {
      setValue(newValue);
    },
    [setValue]
  );

  return (
    <TextFieldWithMessageVariables
      errors={errorMessage ? [errorMessage] : []}
      formRowProps={{
        describedByIds: idAria ? [idAria] : undefined,
        error: errorMessage,
        fullWidth: true,
        helpText: typeof field.helpText === 'function' ? field.helpText() : field.helpText,
        isInvalid,
        label: field.label,
        ...rest,
      }}
      index={0}
      inputTargetValue={value}
      wrapField
      {...euiFieldProps}
      editAction={editAction}
    />
  );
};
