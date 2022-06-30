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
import './json_field_wrapper.scss';
import { ActionVariable } from '@kbn/alerting-plugin/common';
import { EuiFormRow } from '@elastic/eui';
import { TextFieldWithMessageVariables } from './text_field_with_message_variables';

interface Props {
  field: FieldHook<any, string>;
  messageVariables?: ActionVariable[];
  paramsProperty: string;
  euiCodeEditorProps?: { [key: string]: any };
  [key: string]: any;
}

export const MustacheTextFieldWrapper = ({ field, euiFieldProps = {}, idAria, ...rest }: Props) => {
  const { isInvalid, errorMessage } = getFieldValidityAndErrorMessage(field);

  const { value, onChange } = field;

  const editAction = useCallback(
    (property: string, newValue: string) => {
      onChange({
        // @ts-ignore we don't have to send the whole type
        target: {
          value: newValue,
        },
      });
    },
    [onChange]
  );

  return (
    <EuiFormRow
      label={field.label}
      labelAppend={field.labelAppend}
      helpText={typeof field.helpText === 'function' ? field.helpText() : field.helpText}
      error={errorMessage}
      isInvalid={isInvalid}
      fullWidth
      describedByIds={idAria ? [idAria] : undefined}
      {...rest}
    >
      <TextFieldWithMessageVariables
        editAction={editAction}
        errors={errorMessage ? [errorMessage] : []}
        index={0}
        inputTargetValue={value}
        {...euiFieldProps}
      />
    </EuiFormRow>
  );
};
