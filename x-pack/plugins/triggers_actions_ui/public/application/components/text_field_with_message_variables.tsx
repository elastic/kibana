/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React, { useState } from 'react';
import { EuiFieldText } from '@elastic/eui';
import './add_message_variables.scss';
import { AddMessageVariables } from './add_message_variables';

interface Props {
  messageVariables: string[] | undefined;
  paramsProperty: string;
  index: number;
  inputTargetValue?: string;
  editAction: (property: string, value: any, index: number) => void;
  errors?: string[];
}

export const TextFieldWithMessageVariables: React.FunctionComponent<Props> = ({
  messageVariables,
  paramsProperty,
  index,
  inputTargetValue,
  editAction,
  errors,
}) => {
  const [currentTextElement, setCurrentTextElement] = useState<HTMLInputElement | null>(null);

  const onSelectMessageVariable = (variable: string) => {
    const templatedVar = `{{${variable}}}`;
    const startPosition = currentTextElement?.selectionStart ?? 0;
    const endPosition = currentTextElement?.selectionEnd ?? 0;
    const newValue =
      (inputTargetValue ?? '').substring(0, startPosition) +
      templatedVar +
      (inputTargetValue ?? '').substring(endPosition, (inputTargetValue ?? '').length);
    editAction(paramsProperty, newValue, index);
  };

  const onChangeWithMessageVariable = (e: React.ChangeEvent<HTMLInputElement>) => {
    editAction(paramsProperty, e.target.value, index);
  };

  return (
    <EuiFieldText
      fullWidth
      name={paramsProperty}
      id={`${paramsProperty}Id`}
      isInvalid={errors && errors.length > 0 && inputTargetValue !== undefined}
      data-test-subj={`${paramsProperty}Input`}
      value={inputTargetValue}
      onChange={(e: React.ChangeEvent<HTMLInputElement>) => onChangeWithMessageVariable(e)}
      onFocus={(e: React.FocusEvent<HTMLInputElement>) => {
        setCurrentTextElement(e.target);
      }}
      onBlur={(e: React.FocusEvent<HTMLInputElement>) => {
        if (!inputTargetValue) {
          editAction(paramsProperty, '', index);
        }
      }}
      append={
        <AddMessageVariables
          messageVariables={messageVariables}
          onSelectEventHandler={(variable: string) => onSelectMessageVariable(variable)}
          paramsProperty={paramsProperty}
        />
      }
    />
  );
};
