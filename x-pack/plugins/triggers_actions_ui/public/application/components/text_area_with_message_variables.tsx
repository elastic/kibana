/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import { EuiTextArea, EuiFormRow } from '@elastic/eui';
import './add_message_variables.scss';
import { ActionVariable } from '@kbn/alerting-plugin/common';
import { AddMessageVariables } from './add_message_variables';
import { templateActionVariable } from '../lib';

interface Props {
  messageVariables?: ActionVariable[];
  paramsProperty: string;
  index: number;
  inputTargetValue?: string;
  editAction: (property: string, value: any, index: number) => void;
  label: string;
  errors?: string[];
}

export const TextAreaWithMessageVariables: React.FunctionComponent<Props> = ({
  messageVariables,
  paramsProperty,
  index,
  inputTargetValue,
  editAction,
  label,
  errors,
}) => {
  const [currentTextElement, setCurrentTextElement] = useState<HTMLTextAreaElement | null>(null);

  const onSelectMessageVariable = (variable: ActionVariable) => {
    const templatedVar = templateActionVariable(variable);
    const startPosition = currentTextElement?.selectionStart ?? 0;
    const endPosition = currentTextElement?.selectionEnd ?? 0;
    const newValue =
      (inputTargetValue ?? '').substring(0, startPosition) +
      templatedVar +
      (inputTargetValue ?? '').substring(endPosition, (inputTargetValue ?? '').length);
    editAction(paramsProperty, newValue, index);
  };

  const onChangeWithMessageVariable = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    editAction(paramsProperty, e.target.value, index);
  };

  return (
    <EuiFormRow
      fullWidth
      error={errors}
      isInvalid={errors && errors.length > 0 && inputTargetValue !== undefined}
      label={label}
      labelAppend={
        <AddMessageVariables
          messageVariables={messageVariables}
          onSelectEventHandler={onSelectMessageVariable}
          paramsProperty={paramsProperty}
        />
      }
    >
      <EuiTextArea
        fullWidth
        isInvalid={errors && errors.length > 0 && inputTargetValue !== undefined}
        name={paramsProperty}
        value={inputTargetValue || ''}
        data-test-subj={`${paramsProperty}TextArea`}
        onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => onChangeWithMessageVariable(e)}
        onFocus={(e: React.FocusEvent<HTMLTextAreaElement>) => {
          setCurrentTextElement(e.target);
        }}
        onBlur={() => {
          if (!inputTargetValue) {
            editAction(paramsProperty, '', index);
          }
        }}
      />
    </EuiFormRow>
  );
};
