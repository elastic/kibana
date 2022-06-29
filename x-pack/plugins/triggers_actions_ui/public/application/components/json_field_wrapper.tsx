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
import { JsonEditorWithMessageVariables } from './json_editor_with_message_variables';

interface Props {
  field: FieldHook<any, string>;
  messageVariables?: ActionVariable[];
  paramsProperty: string;
  euiCodeEditorProps?: { [key: string]: any };
  [key: string]: any;
}

export const JsonFieldWrapper = ({ field, ...rest }: Props) => {
  const { errorMessage } = getFieldValidityAndErrorMessage(field);

  const { label, helpText, value, setValue } = field;

  const onJsonUpdate = useCallback(
    (updatedJson: string) => {
      setValue(updatedJson);
    },
    [setValue]
  );

  return (
    <JsonEditorWithMessageVariables
      errors={errorMessage ? [errorMessage] : []}
      helpText={<p>{helpText}</p>}
      inputTargetValue={value}
      label={label ?? 'JSON Editor'}
      onDocumentsChange={onJsonUpdate}
      {...rest}
    />
  );
};
